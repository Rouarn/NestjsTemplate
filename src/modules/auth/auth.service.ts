import { JWT_CONSTANTS } from '@/common/constants';
import { isEnabled } from '@/common/enums';
import { BusinessException } from '@/common/exceptions';
import { CurrentUser } from '@/common/interfaces';
import { AppConfigService } from '@/config';
import { DatabaseService } from '@/database';
import { getCurrentTimestamp } from '@/utils';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as svgCaptcha from 'svg-captcha';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import type {
  CaptchaResponseDto,
  CaptchaVerifyDto,
  CaptchaVerifyResponseDto,
} from './dto/captcha.dto';
import type { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/password.dto';
import { AuthCreateUserResponse, RegisterDto } from './dto/register.dto';
import type { RefreshTokenDto, TokenResponseDto } from './dto/token.dto';
import { Auth } from './entities/auth.entity';

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
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * 生成验证码
   *
   * 生成SVG格式的验证码图片和对应的令牌，支持多种验证码类型
   *
   * @returns 包含验证码图片、令牌、过期时间等信息
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

    const captchaToken = `captcha_${crypto.createHash('md5').update(captcha.text.toLowerCase()).digest('hex')}_${crypto.randomBytes(16).toString('hex')}`;

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
   * 校验用户输入的验证码是否正确
   *
   * @param captchaVerifyDto 验证码验证数据
   * @returns 验证结果
   */
  async verifyCaptcha(captchaVerifyDto: CaptchaVerifyDto): Promise<CaptchaVerifyResponseDto> {
    // 验证验证码逻辑
    const { token, code } = captchaVerifyDto;

    if (!token || !code) {
      throw BusinessException.badRequest('验证码token和code不能为空');
    }

    // 从token中提取验证码文本
    const storedToken = token.split('_')[1];

    // 比较验证码文本是否匹配
    if (storedToken !== crypto.createHash('md5').update(code.toLowerCase()).digest('hex')) {
      throw BusinessException.badRequest('验证码错误');
    }

    return { message: '验证成功' };
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
    return await this.databaseService.getDataSource().transaction(async (manager) => {
      // 检查用户名是否已存在
      const existingAuth = await manager.findOne(Auth, {
        where: { username: registerDto.username },
      });

      if (existingAuth) {
        throw BusinessException.conflict('用户名已存在', { username: registerDto.username });
      }

      // 创建认证记录
      const { salt, hashedPassword } = this.encryptPassword(registerDto.password);
      const auth = manager.create(Auth, {
        username: registerDto.username,
        password: hashedPassword,
        salt,
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
   * @throws UnauthorizedException 认证失败
   * @throws BadRequestException 账号被锁定或其他业务错误
   */
  async login(loginDto: LoginDto, clientIp?: string): Promise<TokenResponseDto> {
    // 查找认证记录，包含关联的用户信息，并显式选择密码和盐值
    const auth = await this.authRepository
      .createQueryBuilder('auth')
      .leftJoinAndSelect('auth.user', 'user')
      .addSelect(['auth.password', 'auth.salt'])
      .where('auth.username = :username', { username: loginDto.username })
      .getOne();

    if (!auth) {
      // 记录登录失败尝试（可选：防止用户名枚举攻击）
      throw BusinessException.notFound('用户不存在', { username: loginDto.username });
    }

    // 检查账号是否被锁定
    this.checkAccountStatus(auth);

    // 验证密码
    const isPasswordValid = await this.validatePassword(loginDto.password, auth.password);

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

        throw BusinessException.tooManyRequests(
          `账号已被锁定，请 ${Math.ceil(duration / 60000)} 分钟后再试`,
        );
      }

      throw BusinessException.badRequest('登录密码错误', {
        username: loginDto.username,
      });
    }

    // 登录成功，重置登录失败次数和锁定状态
    await this.unlockAccount(auth.id);

    // 更新最后登录时间
    await this.updateLastLogin(auth.id, clientIp);

    // 生成JWT令牌
    if (!auth.user) {
      throw BusinessException.notFound('用户数据异常：缺少关联的用户信息');
    }

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
    const authId = await this.validateRefreshToken(refreshToken);
    if (!authId) {
      throw BusinessException.unauthorized('刷新令牌无效或已过期');
    }

    // 获取认证信息
    const auth = await this.authRepository.findOne({
      where: { id: authId },
      relations: { user: true },
    });

    if (!auth) {
      throw BusinessException.notFound('认证记录不存在', { authId });
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
   * 生成令牌响应（Access + Refresh，均为自校验 JWT）
   * @param auth 认证实体
   * @returns 令牌响应
   */
  private async issueTokenResponse(auth: Auth): Promise<TokenResponseDto> {
    const payload = {
      authId: auth.id,
      userId: auth.user?.id || auth.id,
      username: auth.username,
      jti: crypto.randomUUID(),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(auth.id);

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
    if (auth.userId) {
      return await this.usersService.findById(auth.userId);
    }

    return {} as User;
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
    // 显式选择密码和盐值用于验证
    const auth = await this.authRepository
      .createQueryBuilder('auth')
      .addSelect(['auth.password', 'auth.salt'])
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

    // 生成新的盐值和密码哈希
    const { salt, hashedPassword } = this.encryptPassword(changePasswordDto.newPassword);

    // 更新密码
    await this.authRepository.update(authId, {
      password: hashedPassword,
      salt,
      passwordChangedAt: new Date(),
    });

    return { message: '密码修改成功' };
  }

  /**
   * 用户登出
   *
   * 精简版：服务端不再维护 Token 黑名单，登出由前端丢弃令牌完成。
   * 此接口保留用于业务侧记录登出事件或后续扩展。
   *
   * @returns 登出结果
   */
  async logout(_token: string): Promise<{ message: string }> {
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
   * @param password 原始密码
   * @returns 包含盐值和哈希密码的对象
   */
  private encryptPassword(password: string): { salt: string; hashedPassword: string } {
    const salt = bcrypt.genSaltSync(this.appConfig.bcryptSaltRounds);
    const hashedPassword = bcrypt.hashSync(password, salt);
    return { salt, hashedPassword };
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
  public isAccountLocked(auth: Auth): boolean {
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
  private async generateRefreshToken(authId: string): Promise<string> {
    return this.jwtService.signAsync(
      { authId, timestamp: getCurrentTimestamp() },
      {
        secret: this.appConfig.jwtOptions.secret,
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
  private async validateRefreshToken(refreshToken: string): Promise<string | null> {
    try {
      const payload = await this.jwtService.verifyAsync<{ authId: string }>(refreshToken, {
        secret: this.appConfig.jwtOptions.secret,
        algorithms: ['HS256'],
      });
      return payload.authId ?? null;
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
   * 解锁账号
   *
   * @param authId 认证ID
   */
  private async unlockAccount(authId: string): Promise<void> {
    await this.authRepository.update(authId, {
      loginAttempts: 0,
      lockedAt: undefined,
    });
  }

  /**
   * 更新最后登录时间
   *
   * @param authId 认证ID
   * @param clientIp
   */
  private async updateLastLogin(authId: string, clientIp?: string): Promise<void> {
    const updateData: Partial<Auth> = {
      lastLoginAt: new Date(),
    };
    if (clientIp) {
      updateData.lastLoginIp = clientIp;
    }
    await this.authRepository.update(authId, updateData);
  }
}
