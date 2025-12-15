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

import { DoctorsService } from './doctor.service';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';

@ApiTags('Doctors')
@ApiBearerAuth('access-token')
@Controller('doctor') // Ruta real: /doctor
export class DoctorsController {
  private readonly logger = new Logger(DoctorsController.name);

  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @Auth(Role.admin)
  @ApiOperation({
    summary: 'Listar doctores (Admin)',
    description:
      'Devuelve doctores con paginación y filtros opcionales (search y specialty). Requiere rol admin.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'dr' })
  @ApiQuery({
    name: 'specialty',
    required: false,
    type: String,
    example: 'Medicina',
  })
  @ApiOkResponse({
    description:
      'OK. Nota: la respuesta real va envuelta por TransformInterceptor (statusCode, timestamp, path, method, data).',
  })
  @ApiUnauthorizedResponse({
    description: 'No autenticado (token inválido/ausente).',
  })
  @ApiForbiddenResponse({ description: 'No autorizado (no tiene rol admin).' })
  async getDoctors(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('search') search?: string,
    @Query('specialty') specialty?: string,
  ) {
    this.logger.log(
      `GET /doctor - page: ${page}, limit: ${limit}, search: ${search}, specialty: ${specialty}`,
    );
    return this.doctorsService.getDoctors(page, limit, search, specialty);
  }
}
