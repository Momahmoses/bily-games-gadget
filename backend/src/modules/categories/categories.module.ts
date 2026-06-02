import { Module } from '@nestjs/common';
import { CategoriesService, CreateCategoryDto } from './categories.service';
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public, Roles } from '../../common/decorators';
import { UpdateCategoryDto } from './categories.service';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public() @Get()
  findAll(@Query('includeChildren') includeChildren?: boolean) {
    return this.categoriesService.findAll(includeChildren !== false);
  }

  @Public() @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.categoriesService.findOne(idOrSlug);
  }

  @Post() @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id') @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id') @Roles('ADMIN', 'SUPER_ADMIN') @HttpCode(HttpStatus.OK) @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
