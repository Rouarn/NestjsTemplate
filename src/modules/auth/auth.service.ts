import { CAPTCHA_CONSTANTS, JWT_CONSTANTS, TOKEN_TYPES } from '../../common/constants/index.js';
import { isEnabled } from '../../common/enums/index.js';
import { BusinessException } from '../../common/exceptions/index.js';
import { CurrentUser } from '../../common/interfaces/index.js';
import { AppConfigService } from '../../config/index.js';
import { DatabaseService } from '../../database/index.js';
import { TokenVersionService } from '../../shared/auth-token/index.js';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as svgCaptcha from 'svg-captcha';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type {
  CaptchaResponseDto,
  CaptchaVerifyDto,
  CaptchaVerifyResponseDto,
} from './dto/captcha.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/password.dto.js';
import { AuthCreateUserResponse, RegisterDto } from './dto/register.dto.js';
import type { RefreshTokenDto, TokenResponseDto } from './dto/token.dto.js';
import { Auth } from './entities/auth.entity.js';

/**
 * 账号不存在时用于比对的占位 bcrypt 哈希（cost 10）
 *
 * 目的：账号存在与否都执行一次同等成本的 `bcrypt.compare`，
 * 避免通过响应耗时区分「用户不存在」与「密码错误」。
 */
const DUMMY_PASSWORD_HASH = '$2b$10$cE2IqQctIfeCO/EnG3lpb.pc.7cjYrWQH2GRRPRC3WvjUCIv1JehS';

/**
 * 登录失败统一文案
 *
 * 用户不存在、密码错误、账号被锁定/禁用一律返回同一句提示，
 * 防止通过差异化文案枚举用户名与账号状态。
 */
const LOGIN_FAILED_MESSAGE = '用户名或密码错误';

/**
 * 认证服务（AuthService）
 * 专注于用户认证相关的核心业务逻辑，与用户管理功能完全分离。
 *
 * 精简说明：
 * - 移除了 Token 黑名单、在线用户监控、踢出用户等逻辑；
 * - 刷新令牌改为自校验的 JWT，不再依赖外部缓存存储；
 * - 登出 = 前端丢弃令牌，服务端不再维护黑名单。
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** 由 JWT 主密钥派生的验证码专用子密钥，避免不同用途共用同一把密钥 */
  private readonly captchaKey: Buffer;

  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly appConfig: AppConfigService,
    private readonly tokenVersionService: TokenVersionService,
  ) {
    this.captchaKey = crypto
      .createHmac('sha256', appConfig.jwtOptions.secret)
      .update('captcha-purpose')
      .digest();
  }

  /**
   * 生成验证码
   *
   * 生成SVG格式的验证码图片和对应的令牌。
   * 令牌为服务端 HMAC 签名的无状态凭证：载荷包含答案哈希与过期时间，
   * 客户端无法伪造或离线推算答案，无需依赖外部缓存存储。
   *
   * @returns 包含验证码图片和令牌的信息
   */
  async generateCaptcha(): Promise<CaptchaResponseDto> {
    // 创建验证码，设置选项使其更安全
    const captcha = svgCaptcha.create({
      size: 4, // 验证码长度
      ignoreChars: '0o1il', // 排除容易混淆的字符
      noise: 3, // 干扰线条数量
      color: true, // 文字颜色
      background: '#f0f0f0', // 背景色
      width: 120,
      height: 40,
      fontSize: 36,
    });

    const captchaToken = this.createCaptchaToken(captcha.text);

    // 将SVG验证码转换为base64格式的图片
    const captchaImage = `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`;

    return {
      image: captchaImage,
      token: captchaToken,
    };
  }

  /**
   * 验证验证码
   *
   * 校验用户输入的验证码是否正确（签名、有效期、答案三项）
   *
   * @param captchaVerifyDto 验证码验证数据
   * @returns 验证结果
   */
  async verifyCaptcha(captchaVerifyDto: CaptchaVerifyDto): Promise<CaptchaVerifyResponseDto> {
    const { token, code } = captchaVerifyDto;
    this.assertCaptchaValid(token, code);
    return { message: '验证成功' };
  }

  /**
   * 生成验证码令牌
   *
   * 结构：base64url(答案哈希.过期时间戳).签名
   * 签名为服务端密钥对载荷的 HMAC-SHA256，客户端无法篡改或伪造。
   *
   * @param code 验证码答案
   * @returns 签名后的验证码令牌
   */
  private createCaptchaToken(code: string): string {
    // 载荷只放 nonce / 过期时间 / 答案的 HMAC 证明，绝不下发答案的任何可离线校验形式
    const nonce = crypto.randomBytes(16).toString('base64url');
    const expiresAt = Date.now() + CAPTCHA_CONSTANTS.TTL_SECONDS * 1000;
    const proof = this.proofOfAnswer(nonce, code);
    const payload = `${nonce}.${expiresAt}.${proof}`;
    const encodedPayload = Buffer.from(payload, 'utf8').toString('base64url');

    return `${encodedPayload}.${this.signCaptchaPayload(encodedPayload)}`;
  }

  /**
   * 校验验证码令牌，不合法时直接抛出业务异常
   *
   * @param token 验证码令牌
   * @param code 用户输入的验证码
   */
  private assertCaptchaValid(token: string, code: string): void {
    if (!token || !code) {
      throw BusinessException.badRequest('验证码令牌和验证码不能为空');
    }

    const separatorIndex = token.lastIndexOf('.');
    if (separatorIndex <= 0) {
      throw BusinessException.badRequest('验证码令牌无效');
    }

    const encodedPayload = token.slice(0, separatorIndex);
    const signature = token.slice(separatorIndex + 1);

    // 恒定时间比较签名，防止时序攻击
    if (!this.safeEqual(signature, this.signCaptchaPayload(encodedPayload))) {
      throw BusinessException.badRequest('验证码令牌无效');
    }

    const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const parts = payload.split('.');
    if (parts.length !== 3) {
      throw BusinessException.badRequest('验证码令牌无效');
    }

    const [nonce, expiresAtRaw, proof] = parts;
    const expiresAt = Number(expiresAtRaw);

    if (!nonce || !proof || !Number.isFinite(expiresAt)) {
      throw BusinessException.badRequest('验证码令牌无效');
    }

    if (Date.now() > expiresAt) {
      throw BusinessException.badRequest('验证码已过期，请重新获取');
    }

    // 答案只以 HMAC 形式参与比对：客户端持有令牌也无法离线穷举候选答案
    if (!this.safeEqual(proof, this.proofOfAnswer(nonce, code))) {
      throw BusinessException.badRequest('验证码错误');
    }
  }

  /**
   * 计算「答案 + nonce」的 HMAC 证明
   *
   * @param nonce 令牌随机数（防止同一答案在不同令牌间复用证明）
   * @param code 用户提交的验证码
   * @returns base64url 编码的证明
   */
  private proofOfAnswer(nonce: string, code: string): string {
    return crypto
      .createHmac('sha256', this.captchaKey)
      .update(`${nonce}.${code.toLowerCase()}`)
      .digest('base64url');
  }

  /**
   * 恒定时间字符串比较，避免通过比较耗时推断内容
   */
  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  /**
   * 对验证码令牌载荷进行 HMAC 签名
   *
   * @param encodedPayload base64url 编码的载荷
   * @returns base64url 编码的签名
   */
  private signCaptchaPayload(encodedPayload: string): string {
    return crypto.createHmac('sha256', this.captchaKey).update(encodedPayload).digest('base64url');
  }

  /**
   * 用户注册
   *
   * 创建新认证账号，支持同时创建关联的用户资料
   *
   * @param registerDto 包含用户注册信息的数据传输对象
   * @returns 注册结果消息
   * @throws ConflictException 用户名已存在
   * @throws BadRequestException 注册数据验证失败
   */
  async register(registerDto: RegisterDto): Promise<AuthCreateUserResponse> {
    // 先校验验证码，通过后再操作数据库
    this.assertCaptchaValid(registerDto.captchaToken, registerDto.captchaCode);

    return await this.databaseService.getDataSource().transaction(async (manager) => {
      // 检查用户名是否已存在
      const existingAuth = await manager.findOne(Auth, {
        where: { username: registerDto.username },
      });

      if (existingAuth) {
        throw BusinessException.conflict('用户名已存在', { username: registerDto.username });
      }

      // 创建认证记录
      const auth = manager.create(Auth, {
        username: registerDto.username,
        password: await this.hashPassword(registerDto.password),
        passwordChangedAt: new Date(),
        loginAttempts: 0,
      });

      const savedAuth = await manager.save(auth);

      // 检查是否已存在相同邮箱的用户
      if (registerDto.email) {
        const existingUser = await manager.findOne(User, {
          where: { email: registerDto.email },
        });
        if (existingUser) {
          throw BusinessException.conflict('邮箱已被使用', { email: registerDto.email });
        }
      }

      // 创建关联的用户记录
      const user = manager.create(User, {
        auth: savedAuth,
        nickname: registerDto.nickname ?? savedAuth.username,
        email: registerDto.email,
        avatar: registerDto.avatar,
        gender: registerDto.gender,
        mobile: registerDto.mobile,
      });

      await manager.save(user);

      return { message: '注册成功' };
    });
  }

  /**
   * 用户登录
   *
   * 验证用户凭据并生成JWT令牌，包含登录安全控制
   *
   * @param loginDto 包含用户名、密码等登录数据
   * @param clientIp 客户端IP
   * @returns 成功时返回完整的登录响应信息
   * @throws BusinessException 401 凭据错误 / 账号锁定 / 账号禁用（对外文案统一）
   */
  async login(loginDto: LoginDto, clientIp?: string): Promise<TokenResponseDto> {
    // 先校验验证码，通过后再查询账号，避免未授权请求打到数据库
    this.assertCaptchaValid(loginDto.captchaToken, loginDto.captchaCode);

    // 查找认证记录，包含关联的用户信息，并显式选择密码（默认 select:false）
    const auth = await this.authRepository
      .createQueryBuilder('auth')
      .leftJoinAndSelect('auth.user', 'user')
      .addSelect('auth.password')
      .where('auth.username = :username', { username: loginDto.username })
      .getOne();

    // 账号不存在时也执行一次 bcrypt 比较，避免响应耗时泄露账号是否存在
    const isPasswordValid = await this.validatePassword(
      loginDto.password,
      auth?.password ?? DUMMY_PASSWORD_HASH,
    );

    if (!auth) {
      throw BusinessException.unauthorized(LOGIN_FAILED_MESSAGE);
    }

    // 锁定 / 禁用：对外与「凭据错误」保持同一文案，细节只进日志
    this.assertLoginAllowed(auth);

    if (!isPasswordValid) {
      // 增加登录失败次数
      await this.incrementLoginAttempts(auth.id);

      // 更新auth对象的loginAttempts用于后续判断
      const currentAttempts = auth.loginAttempts + 1;
      const { maxLoginAttempts } = this.appConfig.authSecurityOptions;

      // 检查是否需要锁定账号
      if (currentAttempts >= maxLoginAttempts) {
        await this.lockAccount(auth.id);
        const duration = this.calculateLockDuration(currentAttempts);
        this.logger.warn(
          `账号因连续登录失败被锁定 ${Math.ceil(duration / 60000)} 分钟: ${auth.username}`,
        );
      }

      throw BusinessException.unauthorized(LOGIN_FAILED_MESSAGE);
    }

    // 登录成功：重置失败计数、解锁并记录最后登录信息（单条 UPDATE）
    await this.recordSuccessfulLogin(auth.id, clientIp);

    // 生成JWT令牌（issueTokenResponse 内部会校验关联用户是否存在）
    return this.issueTokenResponse(auth);
  }

  /**
   * 刷新访问令牌
   *
   * 使用有效地刷新令牌生成新的访问令牌
   *
   * @param refreshTokenDto 刷新令牌数据
   * @returns 新的令牌信息
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    const { refreshToken } = refreshTokenDto;

    // 验证刷新令牌（自校验 JWT）
    const payload = await this.validateRefreshToken(refreshToken);
    if (!payload) {
      throw BusinessException.unauthorized('刷新令牌无效或已过期');
    }

    const auth = await this.authRepository.findOne({
      where: { id: payload.authId },
      relations: { user: true },
    });

    // 记录已删除，或令牌版本已被吊销（改密 / 禁用 / 改角色）
    if (auth?.tokenVersion !== payload.tokenVersion) {
      throw BusinessException.unauthorized('登录状态已失效，请重新登录');
    }

    // 检查账号状态
    this.checkAccountStatus(auth);

    return this.issueTokenResponse(auth);
  }

  /**
   * 检查账户状态（锁定、禁用）
   * @param auth 认证实体
   */
  private checkAccountStatus(auth: Auth): void {
    // 检查账号是否被锁定
    if (this.isAccountLocked(auth)) {
      const lockDuration = this.calculateLockDuration(auth.loginAttempts);
      const lockTime = new Date(auth.lockedAt!.getTime() + lockDuration);

      const remainingMs = lockTime.getTime() - new Date().getTime();
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      throw BusinessException.tooManyRequests(`账号已被锁定，请 ${remainingMinutes} 分钟后再试`, {
        lockTime: lockTime.toLocaleString(),
        locked: true,
        remainingMinutes,
      });
    }

    // 检查认证状态
    if (!isEnabled(auth.status)) {
      throw BusinessException.forbidden('访问被禁用', {
        username: auth.username,
        disabled: true,
      });
    }
  }

  /**
   * 登录场景的账号可用性校验
   *
   * 与 {@link checkAccountStatus} 的区别：这里把「锁定 / 禁用」统一折叠为
   * 「凭据错误」，避免登录接口成为账号状态探测器；具体原因只写服务端日志。
   *
   * @param auth 认证实体
   */
  private assertLoginAllowed(auth: Auth): void {
    if (this.isAccountLocked(auth)) {
      this.logger.warn(`登录被拒：账号处于锁定期 (${auth.username})`);
      throw BusinessException.unauthorized(LOGIN_FAILED_MESSAGE);
    }

    if (!isEnabled(auth.status)) {
      this.logger.warn(`登录被拒：账号已禁用 (${auth.username})`);
      throw BusinessException.unauthorized(LOGIN_FAILED_MESSAGE);
    }
  }

  /**
   * 生成令牌响应（Access + Refresh，均为自校验 JWT）
   * @param auth 认证实体
   * @returns 令牌响应
   */
  private async issueTokenResponse(auth: Auth): Promise<TokenResponseDto> {
    if (!auth.user) {
      throw BusinessException.notFound('用户数据异常：缺少关联的用户信息');
    }

    const payload = {
      sub: auth.id,
      authId: auth.id,
      userId: auth.user.id,
      username: auth.username,
      role: auth.role,
      // 令牌版本：改密 / 禁用 / 改角色后旧令牌失效
      ver: auth.tokenVersion,
      // 令牌用途声明：JwtAuthGuard 只接受 access，避免刷新令牌被当作访问令牌使用
      typ: TOKEN_TYPES.ACCESS,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.appConfig.jwtOptions.secret,
      expiresIn: this.appConfig.jwtOptions.accessTokenTtl,
      algorithm: 'HS256',
    });
    const refreshToken = await this.generateRefreshToken(auth.id, auth.tokenVersion);

    return {
      accessToken,
      refreshToken,
      tokenType: JWT_CONSTANTS.TOKEN_PREFIX,
      accessTokenTtl: this.appConfig.jwtOptions.accessTokenTtl,
      refreshTokenTtl: this.appConfig.jwtOptions.refreshTokenTtl, // 7 days
    };
  }

  /**
   * 获取认证用户详细信息
   *
   * 从数据库查询认证用户的详细信息，包含所有非敏感字段
   *
   * @param auth 认证实体（仅用于获取ID）
   * @returns 包含用户ID、用户名、昵称、头像、邮箱、性别、手机号等信息
   */
  async getAuthInfo(auth: CurrentUser): Promise<User> {
    if (!auth.userId) {
      throw BusinessException.unauthorized('登录状态异常，请重新登录');
    }

    return await this.usersService.findById(auth.userId);
  }

  /**
   * 修改密码
   *
   * 验证旧密码并设置新密码
   *
   * @param changePasswordDto 修改密码数据
   * @param authId 认证ID
   * @returns 修改结果
   */
  async changePassword(
    changePasswordDto: ChangePasswordDto,
    authId: string,
  ): Promise<{ message: string }> {
    // 显式选择密码用于验证
    const auth = await this.authRepository
      .createQueryBuilder('auth')
      .addSelect('auth.password')
      .where('auth.id = :id', { id: authId })
      .getOne();

    if (!auth) {
      throw BusinessException.notFound('认证记录不存在', { authId });
    }

    // 验证旧密码
    const isOldPasswordValid = await this.validatePassword(
      changePasswordDto.oldPassword,
      auth.password,
    );

    if (!isOldPasswordValid) {
      throw BusinessException.badRequest('旧密码错误');
    }

    // 校验两次输入的新密码一致
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw BusinessException.badRequest('两次输入的新密码不一致');
    }

    // 新密码不能与旧密码相同
    if (changePasswordDto.newPassword === changePasswordDto.oldPassword) {
      throw BusinessException.badRequest('新密码不能与旧密码相同');
    }

    // 更新密码（bcrypt 哈希自带盐值）
    await this.authRepository.update(authId, {
      password: await this.hashPassword(changePasswordDto.newPassword),
      passwordChangedAt: new Date(),
    });

    // 递增令牌版本：其他设备上的旧令牌立即失效（含当前会话，需用新密码重新登录）
    await this.tokenVersionService.bump(authId);

    return { message: '密码修改成功，请使用新密码重新登录' };
  }

  /**
   * 用户登出
   *
   * 无状态 JWT 不维护 Token 黑名单，登出由前端丢弃令牌完成；
   * 保留该端点仅为前端提供统一的登出语义。
   *
   * @returns 登出结果
   */
  async logout(): Promise<{ message: string }> {
    return { message: '退出登录成功' };
  }

  /**
   * 验证密码
   *
   * 使用bcrypt验证输入密码与存储密码是否匹配
   *
   * @param inputPassword 用户输入的密码
   * @param storedPassword 存储的加密密码
   * @returns 密码是否匹配
   */
  private async validatePassword(inputPassword: string, storedPassword: string): Promise<boolean> {
    return await bcrypt.compare(inputPassword, storedPassword);
  }

  /**
   * 加密密码
   *
   * bcrypt 会在哈希内部自动生成并嵌入盐值，无需单独存储盐。
   *
   * @param password 原始密码
   * @returns bcrypt 哈希密码
   */
  private async hashPassword(password: string): Promise<string> {
    // 必须用异步版本：bcryptjs 为纯 JS 实现，hashSync 会阻塞事件循环数十到上百毫秒
    return await bcrypt.hash(password, this.appConfig.bcryptSaltRounds);
  }

  /**
   * 计算当前锁定持续时间（指数退避）
   *
   * @param loginAttempts 当前失败次数
   * @returns 锁定持续时间（毫秒）
   */
  private calculateLockDuration(loginAttempts: number): number {
    const { maxLoginAttempts, baseLockDuration, maxLockDuration } =
      this.appConfig.authSecurityOptions;

    // 基础锁定时间（毫秒）
    const baseDurationMs = baseLockDuration * 1000;
    const maxDurationMs = maxLockDuration * 1000;

    // 超过最大尝试次数的额外次数
    const extraAttempts = Math.max(0, loginAttempts - maxLoginAttempts);

    // 指数退避计算: base * (2 ^ extraAttempts)
    const duration = baseDurationMs * Math.pow(2, extraAttempts);

    return Math.min(duration, maxDurationMs);
  }

  /**
   * 检查账号是否被锁定
   *
   * @param auth 认证实体
   * @returns 是否被锁定
   */
  private isAccountLocked(auth: Auth): boolean {
    if (!auth.lockedAt) return false;

    // 动态计算锁定时间
    const lockDuration = this.calculateLockDuration(auth.loginAttempts);
    const now = new Date();
    const lockedAtDate = auth.lockedAt;

    if (Number.isNaN(lockedAtDate.getTime())) return false;

    return now.getTime() - lockedAtDate.getTime() < lockDuration;
  }

  /**
   * 生成刷新令牌（自校验 JWT，无需服务端存储）
   *
   * @param authId 认证ID
   * @returns 刷新令牌字符串
   */
  private async generateRefreshToken(authId: string, tokenVersion: number): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: authId,
        authId,
        ver: tokenVersion,
        typ: TOKEN_TYPES.REFRESH,
        // 预留 jti，便于后续接入黑名单/轮换时按单枚令牌失效
        jti: crypto.randomUUID(),
      },
      {
        // 刷新令牌使用独立密钥（未配置时回退主密钥），即便泄露也不等同于访问令牌密钥
        secret: this.appConfig.jwtOptions.refreshSecret,
        expiresIn: this.appConfig.jwtOptions.refreshTokenTtl,
        algorithm: 'HS256',
      },
    );
  }

  /**
   * 验证刷新令牌
   *
   * 验证刷新令牌的有效性并返回关联的认证ID
   *
   * @param refreshToken 刷新令牌
   * @returns 认证ID或null
   */
  private async validateRefreshToken(
    refreshToken: string,
  ): Promise<{ authId: string; tokenVersion: number } | null> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        authId?: string;
        ver?: number;
        typ?: string;
      }>(refreshToken, {
        secret: this.appConfig.jwtOptions.refreshSecret,
        algorithms: ['HS256'],
      });

      // 只接受刷新令牌：访问令牌不能用来换取新令牌，否则 1 小时的访问令牌
      // 可以无限续期出新的 7 天刷新令牌，会话将永不失效
      if (payload.typ !== TOKEN_TYPES.REFRESH) {
        return null;
      }

      if (!payload.authId || typeof payload.ver !== 'number') {
        return null;
      }

      return { authId: payload.authId, tokenVersion: payload.ver };
    } catch {
      return null;
    }
  }

  /**
   * 增加登录失败次数
   *
   * @param authId 认证ID
   */
  private async incrementLoginAttempts(authId: string): Promise<void> {
    await this.authRepository.increment({ id: authId }, 'loginAttempts', 1);
  }

  /**
   * 锁定账号
   *
   * @param authId 认证ID
   */
  private async lockAccount(authId: string): Promise<void> {
    await this.authRepository.update(authId, {
      lockedAt: new Date(),
    });
  }

  /**
   * 记录一次成功登录
   *
   * 重置失败计数、清除锁定、更新最后登录时间与 IP，合并为单条 UPDATE。
   * 注意：`lockedAt` 传 undefined 会被 TypeORM 忽略导致残留，必须用原始片段写 NULL。
   *
   * @param authId 认证ID
   * @param clientIp 客户端 IP
   */
  private async recordSuccessfulLogin(authId: string, clientIp?: string): Promise<void> {
    await this.authRepository.update(authId, {
      loginAttempts: 0,
      lockedAt: () => 'NULL',
      lastLoginAt: new Date(),
      ...(clientIp ? { lastLoginIp: clientIp } : {}),
    });
  }
}
