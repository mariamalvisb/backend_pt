import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ========= helpers =========
  private async signTokens(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };

    // Segundos (evita el lío de tipos con "15m", "7d")
    const accessExpires = Number(process.env.JWT_ACCESS_EXPIRES_IN_SEC ?? 900); // 15 min
    const refreshExpires = Number(
      process.env.JWT_REFRESH_EXPIRES_IN_SEC ?? 604800,
    ); // 7 días

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: accessExpires,
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: refreshExpires,
    });

    return { accessToken, refreshToken };
  }

  private async saveHashedRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  // ============ REGISTRO ============
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role,

        ...(dto.role === 'doctor'
          ? {
              doctor: {
                create: {
                  specialty: (dto as any).specialty ?? null,
                },
              },
            }
          : {}),
        ...(dto.role === 'patient'
          ? {
              patient: {
                create: {
                  phone: (dto as any).phone ?? null,
                  birthDate: (dto as any).birthDate
                    ? new Date((dto as any).birthDate)
                    : null,
                },
              },
            }
          : {}),
      },
      include: { doctor: true, patient: true },
    });

    const tokens = await this.signTokens(user.id, user.email, user.role);
    await this.saveHashedRefreshToken(user.id, tokens.refreshToken);

    const { password, hashedRefreshToken, ...safeUser } = user;

    return { user: safeUser, ...tokens };
  }

  // ============ LOGIN ============
  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { doctor: true, patient: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.signTokens(user.id, user.email, user.role);
    await this.saveHashedRefreshToken(user.id, tokens.refreshToken);

    const { password, hashedRefreshToken, ...safeUser } = user;

    return { user: safeUser, ...tokens };
  }

  // ============ REFRESH ============
  async refreshToken(userId: string, email: string, refreshToken: string) {
    if (!userId || !refreshToken) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    const matches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!matches) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    const tokens = await this.signTokens(user.id, email, user.role);
    await this.saveHashedRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  // ============ LOGOUT ============
  async logout(userId: string, _email: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });

    return { message: 'Logout successful' };
  }
}
