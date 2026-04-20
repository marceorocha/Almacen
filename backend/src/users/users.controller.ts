import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  profile(@CurrentUser() user: User): User {
    return user;
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  changeOwnPassword(
    @CurrentUser() user: User,
    @Body() dto: ChangeOwnPasswordDto,
  ): Promise<User> {
    return this.usersService.changeOwnPassword(user.id, dto);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  list(): Promise<User[]> {
    return this.usersService.list();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findByIdOrFail(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  updateAsAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser() actor: User,
  ): Promise<User> {
    return this.usersService.updateByAdmin(actor, id, dto);
  }
}
