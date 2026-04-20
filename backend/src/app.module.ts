import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ArticuloSerieModule } from './articulo-serie/articulo-serie.module';
import { AlertasModule } from './alertas/alertas.module';
import { AlmacenesModule } from './almacenes/almacenes.module';
import { ArticulosModule } from './articulos/articulos.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { MovimientosModule } from './movimientos/movimientos.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { StockModule } from './stock/stock.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions =>
        configService.getOrThrow<TypeOrmModuleOptions>('database'),
    }),
    HealthModule,
    MailModule,
    UsersModule,
    AuthModule,
    AlmacenesModule,
    ArticulosModule,
    MovimientosModule,
    StockModule,
    ArticuloSerieModule,
    PedidosModule,
    AlertasModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
