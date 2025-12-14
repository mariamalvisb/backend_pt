import {
  Controller,
  Get,
  Query,
  Logger,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';

import { DoctorsService } from './doctor.service';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';

@Controller('doctor')
export class DoctorsController {
  private readonly logger = new Logger(DoctorsController.name);

  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @Auth(Role.admin)
  async getDoctors(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('search') search?: string,
    @Query('specialty') specialty?: string,
  ) {
    this.logger.log(
      `GET /doctors - page: ${page}, limit: ${limit}, search: ${search}, specialty: ${specialty}`,
    );
    return this.doctorsService.getDoctors(page, limit, search, specialty);
  }
}
