import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { MailService } from '../mail/mail.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ChangeOwnPasswordDto } from './dto/change-own-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_MS = 60 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  async create(dto: CreateUserDto): Promise<User> {
    if (dto.role !== UserRole.ADMIN && !dto.almacenId) {
      throw new BadRequestException('almacenId is required for non-admin users');
    }
    if (dto.role === UserRole.ADMIN && dto.almacenId) {
      throw new BadRequestException('admin users must not be tied to a warehouse');
    }
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      password,
      role: dto.role,
      almacenId: dto.almacenId ?? null,
    });
    return this.usersRepository.save(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findByIdOrFail(userId);
    if (dto.name !== undefined) {
      user.name = dto.name;
    }
    if (dto.email !== undefined) {
      const next = dto.email.toLowerCase();
      if (next !== user.email) {
        const taken = await this.usersRepository.findOne({ where: { email: next } });
        if (taken) {
          throw new ConflictException('Email already registered');
        }
        user.email = next;
      }
    }
    return this.usersRepository.save(user);
  }

  async changeOwnPassword(userId: string, dto: ChangeOwnPasswordDto): Promise<User> {
    const user = await this.findWithPasswordById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match) {
      throw new BadRequestException('Current password is incorrect');
    }
    user.password = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    return this.usersRepository.save(user);
  }

  async updateByAdmin(actor: User, targetId: string, dto: AdminUpdateUserDto): Promise<User> {
    if (actor.id === targetId) {
      throw new ForbiddenException(
        'Use PATCH /api/users/me or PATCH /api/users/me/password to update your own account',
      );
    }
    const target = await this.findByIdOrFail(targetId);

    if (
      dto.role !== undefined &&
      target.role === UserRole.ADMIN &&
      dto.role !== UserRole.ADMIN
    ) {
      const adminCount = await this.usersRepository.count({
        where: { role: UserRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot demote the last administrator');
      }
    }

    const newRole = dto.role ?? target.role;
    let newAlmacenId =
      dto.almacenId !== undefined ? dto.almacenId : target.almacenId;

    if (newRole === UserRole.ADMIN) {
      newAlmacenId = null;
    } else if (!newAlmacenId) {
      throw new BadRequestException('almacenId is required for non-admin users');
    }

    if (dto.name !== undefined) {
      target.name = dto.name;
    }
    if (dto.email !== undefined) {
      const next = dto.email.toLowerCase();
      if (next !== target.email) {
        const taken = await this.usersRepository.findOne({ where: { email: next } });
        if (taken) {
          throw new ConflictException('Email already registered');
        }
        target.email = next;
      }
    }
    target.role = newRole;
    target.almacenId = newAlmacenId;

    if (dto.newPassword !== undefined) {
      target.password = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
      target.passwordResetTokenHash = null;
      target.passwordResetExpiresAt = null;
    }

    return this.usersRepository.save(target);
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const message = {
      message:
        'Si el correo existe en el sistema, recibirás instrucciones para restablecer la contraseña.',
    };
    const normalized = email.trim().toLowerCase();
    const user = await this.usersRepository.findOne({ where: { email: normalized } });
    if (!user) {
      return message;
    }
    const plainToken = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    await this.usersRepository.update(
      { id: user.id },
      {
        passwordResetTokenHash: this.hashResetToken(plainToken),
        passwordResetExpiresAt: new Date(Date.now() + RESET_EXPIRY_MS),
      },
    );
    await this.mailService.sendPasswordReset(user.email, plainToken);
    return message;
  }

  async completePasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
    const hash = this.hashResetToken(token.trim());
    const user = await this.usersRepository.findOne({
      where: { passwordResetTokenHash: hash },
    });
    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired reset link');
    }
    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersRepository.update(
      { id: user.id },
      {
        password: hashed,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    );
    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión con la nueva contraseña.' };
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  private async findWithPasswordById(id: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  async list(): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async count(): Promise<number> {
    return this.usersRepository.count();
  }

  async seedInitialAdminIfEmpty(): Promise<void> {
    const total = await this.count();
    if (total > 0) {
      return;
    }
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME ?? 'Administrator';
    if (!email || !password) {
      return;
    }
    await this.create({
      name,
      email,
      password,
      role: UserRole.ADMIN,
    });
  }
}
