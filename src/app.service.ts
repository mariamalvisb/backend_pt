// src/app.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'API de prescripciones funcionando';
  }

  async getUsers() {
    return this.prisma.user.findMany();
  }
}
