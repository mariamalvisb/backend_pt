import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(private prisma: PrismaService) {}

  async getPatients(page: number = 1, limit: number = 10, search?: string) {
    try {
      this.logger.log(
        `Obteniendo pacientes - page: ${page}, limit: ${limit}, search: ${search}`,
      );

      const skip = (page - 1) * limit;

      const where: any = {
        role: 'patient',
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [patients, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            patient: {
              select: {
                id: true,
                birthDate: true,
                _count: {
                  select: {
                    prescriptions: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: patients,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener pacientes: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener pacientes');
    }
  }
}
