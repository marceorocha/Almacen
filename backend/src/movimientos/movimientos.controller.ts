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
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { UpdateMovimientoEstadoDto } from './dto/update-movimiento-estado.dto';
import { Movimiento } from './entities/movimiento.entity';
import { MovimientosService } from './movimientos.service';

@Controller('movimientos')
export class MovimientosController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ALMACEN)
  create(
    @Body() dto: CreateMovimientoDto,
    @CurrentUser() user: User,
  ): Promise<Movimiento> {
    return this.movimientosService.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query('almacenId', new ParseUUIDPipe({ optional: true }))
    almacenId?: string,
  ): Promise<Movimiento[]> {
    return this.movimientosService.listForUser(user, almacenId);
  }

  @Post(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.ALMACEN)
  generatePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Movimiento> {
    return this.movimientosService.generatePdf(id, user);
  }

  @Post(':id/confirmar-recepcion')
  @Roles(UserRole.ADMIN, UserRole.ALMACEN)
  confirmarRecepcion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Movimiento> {
    return this.movimientosService.confirmTransferReception(id, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Movimiento> {
    return this.movimientosService.findOneForUser(id, user);
  }

  @Patch(':id/estado')
  @Roles(UserRole.ADMIN, UserRole.ALMACEN)
  updateEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMovimientoEstadoDto,
    @CurrentUser() user: User,
  ): Promise<Movimiento> {
    return this.movimientosService.updateEstado(id, dto, user);
  }
}
