import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { Role, PrescriptionStatus } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { Response as ExpressResponse } from 'express';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';

@ApiTags('Prescriptions')
@ApiBearerAuth('access-token')
@Controller('prescriptions')
export class PrescriptionsController {
  private readonly logger = new Logger(PrescriptionsController.name);

  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @Auth(Role.doctor)
  @ApiOperation({ summary: 'Crear prescripción (Doctor)' })
  @ApiCreatedResponse({ description: 'Prescripción creada' })
  @ApiBadRequestResponse({ description: 'Body inválido (validaciones DTO)' })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'No tiene rol doctor' })
  async createPrescription(
    @GetUser('id') userId: string,
    @Body() createDto: CreatePrescriptionDto,
  ) {
    this.logger.log(`POST /prescriptions - Doctor: ${userId}`);
    return this.prescriptionsService.createPrescription(userId, createDto);
  }

  @Get('admin')
  @Auth(Role.admin)
  @ApiOperation({ summary: 'Listar prescripciones (Admin)' })
  @ApiQuery({ name: 'status', required: false, enum: PrescriptionStatus })
  @ApiQuery({ name: 'doctorId', required: false, type: String })
  @ApiQuery({ name: 'patientId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ description: 'Listado con paginación' })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'No tiene rol admin' })
  async getAllPrescriptionsAdmin(
    @Query('status') status?: PrescriptionStatus,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    this.logger.log(`GET /prescriptions/admin - Admin - status: ${status}`);
    return this.prescriptionsService.getAllPrescriptions(
      status,
      doctorId,
      patientId,
      from,
      to,
      page,
      limit,
    );
  }

  @Get('me')
  @Auth(Role.patient)
  @ApiOperation({ summary: 'Mis prescripciones (Paciente)' })
  @ApiQuery({ name: 'status', required: false, enum: PrescriptionStatus })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ description: 'Listado con paginación' })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'No tiene rol patient' })
  async getMyPrescriptions(
    @GetUser('id') userId: string,
    @Query('status') status?: PrescriptionStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    this.logger.log(`GET /prescriptions/me - Patient: ${userId}`);
    return this.prescriptionsService.getMyPrescriptions(
      userId,
      status,
      page,
      limit,
    );
  }

  @Put(':id/consume')
  @Auth(Role.patient)
  @ApiOperation({ summary: 'Marcar prescripción como consumida (Paciente)' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la prescripción' })
  @ApiOkResponse({ description: 'Prescripción consumida' })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({
    description: 'No es tu prescripción o no eres patient',
  })
  @ApiNotFoundResponse({ description: 'Prescripción no encontrada' })
  async consumePrescription(
    @GetUser('id') userId: string,
    @Param('id') prescriptionId: string,
  ) {
    this.logger.log(
      `PUT /prescriptions/${prescriptionId}/consume - Patient: ${userId}`,
    );
    return this.prescriptionsService.consumePrescription(
      userId,
      prescriptionId,
    );
  }

  @Get(':id/pdf')
  @Auth(Role.patient, Role.admin)
  @ApiOperation({ summary: 'Descargar PDF de prescripción (Paciente/Admin)' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la prescripción' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'Devuelve un PDF (stream)',
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'No autorizado o no es tu receta' })
  @ApiNotFoundResponse({ description: 'Prescripción no encontrada' })
  async getPrescriptionPdf(
    @GetUser('id') userId: string,
    @Param('id') prescriptionId: string,
    @Res() res: ExpressResponse,
  ) {
    this.logger.log(
      `GET /prescriptions/${prescriptionId}/pdf - User: ${userId}`,
    );
    return this.prescriptionsService.generatePrescriptionPdf(
      userId,
      prescriptionId,
      res,
    );
  }

  @Get()
  @Auth(Role.doctor)
  @ApiOperation({ summary: 'Listar prescripciones del doctor (Doctor)' })
  @ApiQuery({ name: 'status', required: false, enum: PrescriptionStatus })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiOkResponse({ description: 'Listado con paginación' })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'No tiene rol doctor' })
  async getPrescriptions(
    @GetUser('id') userId: string,
    @Query('status') status?: PrescriptionStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('order') order: 'asc' | 'desc' = 'desc',
  ) {
    this.logger.log(`GET /prescriptions - Doctor: ${userId}`);
    return this.prescriptionsService.getPrescriptions(
      userId,
      true,
      status,
      from,
      to,
      page,
      limit,
      order,
    );
  }

  @Get(':id')
  @Auth(Role.patient, Role.doctor, Role.admin)
  @ApiOperation({ summary: 'Ver prescripción por ID (Patient/Doctor/Admin)' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la prescripción' })
  @ApiOkResponse({ description: 'Detalle de prescripción' })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({
    description: 'No autorizado o no es tu receta (si patient)',
  })
  @ApiNotFoundResponse({ description: 'Prescripción no encontrada' })
  async getPrescriptionById(
    @GetUser('id') userId: string,
    @Param('id') prescriptionId: string,
  ) {
    this.logger.log(`GET /prescriptions/${prescriptionId} - User: ${userId}`);
    return this.prescriptionsService.getPrescriptionById(
      userId,
      prescriptionId,
    );
  }
}
