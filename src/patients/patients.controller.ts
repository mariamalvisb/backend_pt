import {
  Controller,
  Get,
  Query,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { PatientsService } from './patients.service';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';

@ApiTags('Patients')
@ApiBearerAuth('access-token')
@Controller('patients') // Ruta real: /patients
export class PatientsController {
  private readonly logger = new Logger(PatientsController.name);

  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @Auth(Role.admin, Role.doctor)
  @ApiOperation({
    summary: 'Listar pacientes (Admin / Doctor)',
    description:
      'Devuelve pacientes con paginación y filtro opcional (search). Requiere rol admin o doctor.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'patient',
  })
  @ApiOkResponse({
    description:
      'OK. Nota: la respuesta real va envuelta por TransformInterceptor (statusCode, timestamp, path, method, data).',
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado (token inválido/ausente).',
  })
  @ApiForbiddenResponse({
    description: 'No autorizado (no tiene rol admin/doctor).',
  })
  async getPatients(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('search') search?: string,
  ) {
    this.logger.log(
      `GET /patients - page: ${page}, limit: ${limit}, search: ${search}`,
    );
    return this.patientsService.getPatients(page, limit, search);
  }
}
