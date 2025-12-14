import {
  Controller,
  Get,
  Query,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';

import { PatientsService } from './patients.service';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';

@Controller('patients')
export class PatientsController {
  private readonly logger = new Logger(PatientsController.name);

  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @Auth(Role.admin, Role.doctor)
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
