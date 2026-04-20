import {
  Body,
  Controller,
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
import { AprobarPedidoDto } from './dto/aprobar-pedido.dto';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { Pedido } from './entities/pedido.entity';
import { PedidosService } from './pedidos.service';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  create(
    @Body() dto: CreatePedidoDto,
    @CurrentUser() user: User,
  ): Promise<Pedido> {
    return this.pedidosService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: User): Promise<Pedido[]> {
    return this.pedidosService.findAllForUser(user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Pedido> {
    return this.pedidosService.findOneForUser(id, user);
  }

  @Patch(':id/aprobar')
  @Roles(UserRole.ADMIN, UserRole.ALMACEN)
  aprobar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AprobarPedidoDto,
    @CurrentUser() user: User,
  ): Promise<Pedido> {
    return this.pedidosService.aprobar(id, dto, user);
  }

  @Patch(':id/rechazar')
  @Roles(UserRole.ADMIN, UserRole.ALMACEN)
  rechazar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Pedido> {
    return this.pedidosService.rechazar(id, user);
  }
}
