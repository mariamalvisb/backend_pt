import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DoctorsService {
  private readonly logger = new Logger(DoctorsService.name);

  constructor(private prisma: PrismaService) {}

  async getDoctors(
    page: number = 1,
    limit: number = 10,
    search?: string,
    specialty?: string,
  ) {
    try {
      this.logger.log(
        `Obteniendo doctores - page: ${page}, limit: ${limit}, search: ${search}, specialty: ${specialty}`,
      );

      const skip = (page - 1) * limit;

      const where: any = {
        role: 'doctor',
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (specialty) {
        where.doctor = {
          specialty: {
            contains: specialty,
            mode: 'insensitive',
          },
        };
      }

      const [doctors, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            doctor: {
              select: {
                id: true,
                specialty: true,
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
        data: doctors,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener doctores: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener doctores');
    }
  }
}
