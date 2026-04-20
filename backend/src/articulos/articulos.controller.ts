import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { ArticulosService } from './articulos.service';
import { CreateArticuloDto } from './dto/create-articulo.dto';
import { UpdateArticuloDto } from './dto/update-articulo.dto';
import { Articulo } from './entities/articulo.entity';

@Controller('articulos')
export class ArticulosController {
  constructor(private readonly articulosService: ArticulosService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ALMACEN)
  create(@Body() dto: CreateArticuloDto, @CurrentUser() user: User): Promise<Articulo> {
    return this.articulosService.create(dto, user);
  }

  @Get()
  findAll(): Promise<Articulo[]> {
    return this.articulosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Articulo> {
    return this.articulosService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticuloDto,
  ): Promise<Articulo> {
    return this.articulosService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.articulosService.remove(id);
  }
}
