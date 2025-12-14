import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrescriptionsModule } from './presciptions/prescriptions.module';
@Module({
  imports: [PrismaModule, AuthModule, UsersModule, PrescriptionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
