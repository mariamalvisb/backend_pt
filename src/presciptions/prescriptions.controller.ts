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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { Role, PrescriptionStatus } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { Response } from 'express';

@Controller('prescriptions')
export class PrescriptionsController {
  private readonly logger = new Logger(PrescriptionsController.name);

  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @Auth(Role.doctor)
  async createPrescription(
    @GetUser('id') userId: string,
    @Body() createDto: CreatePrescriptionDto,
  ) {
    this.logger.log(`POST /prescriptions - Doctor: ${userId}`);
    return this.prescriptionsService.createPrescription(userId, createDto);
  }

  @Post('from-audio')
  @Auth(Role.doctor)
  @UseInterceptors(FileInterceptor('audio'))
  async createPrescriptionFromAudio(
    @GetUser('id') userId: string,
    @UploadedFile() file: any,
    @Body('patientId') patientId: string,
  ) {
    this.logger.log(
      `POST /prescriptions/from-audio - Doctor: ${userId}, Patient: ${patientId}`,
    );

    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    if (!patientId) {
      throw new BadRequestException('patientId is required');
    }

    return this.prescriptionsService.createPrescriptionFromAudio(
      userId,
      patientId,
      file.buffer,
      file.originalname,
    );
  }

  @Get('admin')
  @Auth(Role.admin)
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
  async getPrescriptionPdf(
    @GetUser('id') userId: string,
    @Param('id') prescriptionId: string,
    @Res() res: Response,
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
