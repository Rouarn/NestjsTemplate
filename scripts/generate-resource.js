#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { log, showBanner, showSuccess, separator, handleError } = require('@vakao-ui/scripts-utils');
const readline = require('readline');

function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (m) => m.toUpperCase());
}

function toSingular(name) {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
  if (name.endsWith('ses')) return name.slice(0, -2);
  if (name.endsWith('s')) return name.slice(0, -1);
  return name;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
  log(`✅ 创建文件: ${path.relative(process.cwd(), filePath)}`, 'success');
}

function genTemplates(resourceRaw) {
  const resource = resourceRaw.toLowerCase();
  const singular = toSingular(resource);
  const PascalPlural = toPascalCase(resource);
  const PascalSingular = toPascalCase(singular);

  const entity = `import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '@/database';

@Entity('${resource}')
export class ${PascalSingular} extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { comment: 'ID' })
  id!: string;

  @Column({ length: 100, nullable: true, comment: '名称' })
  name!: string;
}
`;

  const dtoCreate = `import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class Create${PascalSingular}Dto {
  @ApiPropertyOptional({ description: '名称', example: '示例名称' })
  @IsOptional()
  @IsString()
  name?: string;
}
`;

  const dtoUpdate = `import { PartialType } from '@nestjs/swagger';
import { Create${PascalSingular}Dto } from './create-${singular}.dto';

export class Update${PascalSingular}Dto extends PartialType(Create${PascalSingular}Dto) {}
`;

  const dtoQuery = `import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class Query${PascalSingular}Dto {
  @ApiPropertyOptional({ description: '当前页码', example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  current?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  @IsInt()
  @Min(1)
  size?: number = 10;
}
`;

  const dtoDelete = `import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsUUID } from 'class-validator';

export class Delete${PascalSingular}Dto {
  @ApiPropertyOptional({ description: '单条记录ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ description: '批量删除ID列表', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  ids?: string[];
}
`;

  const service = `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BusinessException } from '@/common/exceptions';
import type { Create${PascalSingular}Dto } from './dto/create-${singular}.dto';
import type { Update${PascalSingular}Dto } from './dto/update-${singular}.dto';
import type { Delete${PascalSingular}Dto } from './dto/delete-${singular}.dto';
import { ${PascalSingular} } from './entities/${singular}.entity';

@Injectable()
export class ${PascalPlural}Service {
  constructor(
    @InjectRepository(${PascalSingular})
    private readonly repo: Repository<${PascalSingular}>,
  ) {}

  async create(dto: Create${PascalSingular}Dto): Promise<{ message: string }> {
    const entity = this.repo.create(dto as ${PascalSingular});
    await this.repo.save(entity);
    return { message: '创建成功' };
  }

  async findAll(current: number = 1, size: number = 10): Promise<{ list: ${PascalSingular}[]; total: number }> {
    const [list, total] = await this.repo.findAndCount({
      skip: (current - 1) * size,
      take: size,
      order: { createdAt: 'DESC' },
    });
    return { list, total };
  }

  async findById(id: string): Promise<${PascalSingular}> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw BusinessException.notFound('${PascalSingular}不存在', { id });
    }
    return entity;
  }

  async update(id: string, dto: Update${PascalSingular}Dto): Promise<void> {
    const entity = await this.findById(id);
    Object.assign(entity, dto);
    await this.repo.save(entity);
    return;
  }

  async remove(dto: Delete${PascalSingular}Dto): Promise<{ message: string; }> {
    if (dto.id) {
      const entity = await this.findById(dto.id);
      await this.repo.remove(entity);
      return { message: '删除成功' };
    }
    if (dto.ids?.length) {
      const list = await this.repo.findBy({ id: In(dto.ids) });
      if (list.length === 0) {
        throw BusinessException.notFound('要删除的记录不存在', { ids: dto.ids });
      }
      await this.repo.remove(list);
      return { message: \`成功删除 \${list.length} 条记录\`, };
    }
    throw BusinessException.badRequest('缺少删除参数', { message: '必须提供要删除的记录 ID 或 ID 列表' });
  }
}
`;

  const controller = `import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ${PascalPlural}Service } from './${resource}.service';
import { ${PascalSingular} } from './entities/${singular}.entity';
import { Create${PascalSingular}Dto } from './dto/create-${singular}.dto';
import { Update${PascalSingular}Dto } from './dto/update-${singular}.dto';
import { Query${PascalSingular}Dto } from './dto/query-${singular}.dto';
import { Delete${PascalSingular}Dto } from './dto/delete-${singular}.dto';

@ApiTags('${PascalPlural}管理')
@ApiBearerAuth()
@Controller('${resource}')
export class ${PascalPlural}Controller {
  constructor(private readonly service: ${PascalPlural}Service) {}

  @Post()
  @ApiOperation({ summary: '创建记录' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() dto: Create${PascalSingular}Dto): Promise<{ message: string }> {
    return await this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '查询全表' })
  @ApiQuery({ name: 'current', required: false, description: '当前页码', example: 1 })
  @ApiQuery({ name: 'size', required: false, description: '每页数量', example: 10 })
  @ApiResponse({ status: 200, description: '分页列表' })
  async findAll(@Query() query: Query${PascalSingular}Dto): Promise<{ list: ${PascalSingular}[]; total: number }> {
    const { current, size } = query;
    return await this.service.findAll(current, size);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询单条' })
  @ApiParam({ name: 'id', description: '记录ID', type: String })
  @ApiResponse({ status: 200, description: '记录详情', type: ${PascalSingular} })
  async findOne(@Param('id') id: string): Promise<${PascalSingular}> {
    return await this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改单条' })
  @ApiParam({ name: 'id', description: '记录ID', type: String })
  @ApiResponse({ status: 200, description: '修改成功' })
  async update(@Param('id') id: string, @Body() dto: Update${PascalSingular}Dto): Promise<void> {
    return await this.service.update(id, dto);
  }

  @Delete()
  @ApiOperation({ summary: '删除记录' })
  @ApiQuery({ name: 'id', required: false, description: '单条记录ID', type: String })
  @ApiQuery({ name: 'ids', required: false, description: '批量删除ID列表', type: [String] })
  @ApiResponse({ status: 200, description: '删除成功' })
  async delete(@Query() query: Delete${PascalSingular}Dto): Promise<{ message: string; }> {
    return await this.service.remove(query);
  }
}
`;

  const module = `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${PascalPlural}Controller } from './${resource}.controller';
import { ${PascalPlural}Service } from './${resource}.service';
import { ${PascalSingular} } from './entities/${singular}.entity';

@Module({
  imports: [TypeOrmModule.forFeature([${PascalSingular}])],
  controllers: [${PascalPlural}Controller],
  providers: [${PascalPlural}Service],
  exports: [${PascalPlural}Service, TypeOrmModule],
})
export class ${PascalPlural}Module {}
`;

  return { entity, dtoCreate, dtoUpdate, dtoQuery, dtoDelete, service, controller, module };
}

function updateAppModule(resource) {
  const root = path.resolve(__dirname, '..');
  const appModulePath = path.join(root, 'src', 'app.module.ts');

  if (!fs.existsSync(appModulePath)) {
    log('未找到 app.module.ts，跳过注册', 'warning');
    return;
  }

  let content = fs.readFileSync(appModulePath, 'utf8');
  const PascalPlural = toPascalCase(resource.toLowerCase());
  const moduleName = `${PascalPlural}Module`;
  const importPath = `./modules/${resource.toLowerCase()}/${resource.toLowerCase()}.module`;
  const importLine = `import { ${moduleName} } from '${importPath}';`;

  if (content.includes(moduleName)) {
    log('模块似乎已在 app.module.ts 中注册，跳过更新', 'warning');
    return;
  }

  // 1. 添加模块导入
  const importRegex = /^import .+ from .+;$/gm;
  let lastImportIndex = -1;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    lastImportIndex = match.index + match[0].length;
  }

  if (lastImportIndex !== -1) {
    content =
      content.slice(0, lastImportIndex) + '\n' + importLine + content.slice(lastImportIndex);
  } else {
    content = importLine + '\n' + content;
  }

  // 2. 添加模块到 imports 数组
  const importsStart = content.indexOf('imports: [');
  if (importsStart !== -1) {
    let depth = 0;
    let foundImports = false;
    let insertPos = -1;

    for (let i = importsStart; i < content.length; i++) {
      if (content[i] === '[') {
        depth++;
        foundImports = true;
      } else if (content[i] === ']') {
        depth--;
        if (foundImports && depth === 0) {
          insertPos = i;
          break;
        }
      }
    }

    if (insertPos !== -1) {
      const lastNewLine = content.lastIndexOf('\n', insertPos);
      if (lastNewLine !== -1) {
        const insertion = `    ${moduleName}, // 自动生成模块\n`;
        content = content.slice(0, lastNewLine + 1) + insertion + content.slice(lastNewLine + 1);
      }
    }
  }

  fs.writeFileSync(appModulePath, content, 'utf8');
  log(`更新 app.module.ts: 注册 ${moduleName}`, 'success');
}

function generate(resource) {
  showBanner('生成基础CRUD资源');
  separator('─', 50);

  const root = path.resolve(__dirname, '..');
  const baseDir = path.join(root, 'src', 'modules', resource.toLowerCase());
  const dtoDir = path.join(baseDir, 'dto');
  const entitiesDir = path.join(baseDir, 'entities');

  if (fs.existsSync(baseDir)) {
    log('目标模块目录已存在，已跳过创建', 'warning');
    return;
  }

  ensureDir(dtoDir);
  ensureDir(entitiesDir);

  const t = genTemplates(resource);

  writeFile(path.join(entitiesDir, `${toSingular(resource)}.entity.ts`), t.entity);
  writeFile(path.join(dtoDir, `create-${toSingular(resource)}.dto.ts`), t.dtoCreate);
  writeFile(path.join(dtoDir, `update-${toSingular(resource)}.dto.ts`), t.dtoUpdate);
  writeFile(path.join(dtoDir, `query-${toSingular(resource)}.dto.ts`), t.dtoQuery);
  writeFile(path.join(dtoDir, `delete-${toSingular(resource)}.dto.ts`), t.dtoDelete);
  writeFile(path.join(baseDir, `${resource}.service.ts`), t.service);
  writeFile(path.join(baseDir, `${resource}.controller.ts`), t.controller);
  writeFile(path.join(baseDir, `${resource}.module.ts`), t.module);

  updateAppModule(resource);

  showSuccess('🎉 资源生成完成');
}

function main() {
  const [, , nameArg] = process.argv;
  if (nameArg) {
    generate(nameArg);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('请输入资源名称 (例如: posts): ', (answer) => {
    const name = String(answer || '').trim();
    if (!name) {
      log('资源名称不能为空', 'error');
      rl.close();
      return main();
    }
    rl.close();
    generate(name);
  });
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    handleError('生成资源失败', err);
  }
}

module.exports = { generate };
