import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { ArticuloSerieService } from './articulo-serie.service';
import { CreateArticuloSerieDto } from './dto/create-articulo-serie.dto';
import { UpdateArticuloSerieDto } from './dto/update-articulo-serie.dto';
import { ArticuloSerie } from './entities/articulo-serie.entity';

@Controller('articulo-series')
export class ArticuloSerieController {
  constructor(private readonly articuloSerieService: ArticuloSerieService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ALMACEN)
  create(
    @Body() dto: CreateArticuloSerieDto,
    @CurrentUser() user: User,
  ): Promise<ArticuloSerie> {
    return this.articuloSerieService.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('almacenId', new ParseUUIDPipe({ optional: true }))
    almacenId?: string,
    @Query('articuloId', new ParseUUIDPipe({ optional: true }))
    articuloId?: string,
  ): Promise<ArticuloSerie[]> {
    return this.articuloSerieService.findAllForUser(user, {
      almacenId,
      articuloId,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ArticuloSerie> {
    return this.articuloSerieService.findOneForUser(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ALMACEN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticuloSerieDto,
    @CurrentUser() user: User,
  ): Promise<ArticuloSerie> {
    return this.articuloSerieService.update(id, dto, user);
  }
}
