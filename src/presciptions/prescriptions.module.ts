import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ElevenlabsService } from '../integrations/elevenlabs.service';
import { OpenaiService } from '../integrations/openai.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, ElevenlabsService, OpenaiService],
})
export class PrescriptionsModule {}
