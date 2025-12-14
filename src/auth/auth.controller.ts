import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { GetUser } from './decorators/get-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar usuario (doctor o patient)' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Usuario registrado',
    schema: {
      example: {
        statusCode: 201,
        timestamp: '2025-12-14T22:42:20.626Z',
        path: '/auth/register',
        method: 'POST',
        data: {
          user: {
            id: 'cmj...',
            email: 'newuser@test.com',
            name: 'Usuario Prueba',
            role: 'patient',
          },
        },
      },
    },
  })
  async register(@Body() dto: RegisterDto) {
    this.logger.log(`Registro de usuario: ${dto.email}`);
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login (retorna accessToken y refreshToken)' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login exitoso',
    schema: {
      example: {
        statusCode: 200,
        timestamp: '2025-12-14T22:42:20.626Z',
        path: '/auth/login',
        method: 'POST',
        data: {
          user: {
            id: 'cmj...',
            email: 'patient@test.com',
            name: 'Paciente Prueba A',
            role: 'patient',
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Intento de login para: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({
    summary: 'Refrescar tokens',
    description:
      'Usa el refresh token en Authorization: Bearer <refreshToken> (según tu strategy jwt-refresh).',
  })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Tokens renovados',
    schema: {
      example: {
        statusCode: 200,
        timestamp: '2025-12-14T22:45:20.626Z',
        path: '/auth/refresh',
        method: 'POST',
        data: {
          accessToken: 'nuevo_access_token...',
          refreshToken: 'nuevo_refresh_token...',
        },
      },
    },
  })
  async refresh(
    @Body() _dto: RefreshTokenDto,
    @GetUser('id') userId: string,
    @GetUser('email') email: string,
    @GetUser('refreshToken') refreshToken: string,
  ) {
    return this.authService.refreshToken(userId, email, refreshToken);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Perfil',
    schema: {
      example: {
        statusCode: 200,
        timestamp: '2025-12-14T22:46:20.626Z',
        path: '/auth/profile',
        method: 'GET',
        data: {
          message: 'Perfil del usuario autenticado',
          user: {
            id: 'cmj...',
            email: 'patient@test.com',
            name: 'Paciente Prueba A',
            role: 'patient',
          },
        },
      },
    },
  })
  async getProfile(@GetUser() user: any) {
    this.logger.log(`Obteniendo perfil para usuario: ${user.email}`);
    return {
      message: 'Perfil del usuario autenticado',
      user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Logout ok',
    schema: {
      example: {
        statusCode: 200,
        timestamp: '2025-12-14T22:47:20.626Z',
        path: '/auth/logout',
        method: 'POST',
        data: { message: 'Sesión cerrada' },
      },
    },
  })
  async logout(@GetUser('id') userId: string, @GetUser('email') email: string) {
    this.logger.log(`Cerrando sesión para usuario: ${email}`);
    return this.authService.logout(userId, email);
  }
}
