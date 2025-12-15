import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('App')
@ApiBearerAuth('access-token') // quítalo si NO quieres auth aquí
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@ApiForbiddenResponse({ description: 'No autorizado (rol insuficiente)' })
@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Hello / Health simple' })
  @ApiOkResponse({ description: 'OK' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios (demo)' })
  @ApiOkResponse({ description: 'Listado de usuarios' })
  getUsers() {
    return this.appService.getUsers();
  }
}
