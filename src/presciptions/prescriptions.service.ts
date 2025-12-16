import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { PrescriptionStatus } from '@prisma/client';
import { nanoid } from 'nanoid';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(private prisma: PrismaService) {}

  async createPrescription(userId: string, createDto: CreatePrescriptionDto) {
    try {
      this.logger.log(
        `Doctor ${userId} creando prescripción para paciente ${createDto.patientId}`,
      );

      const doctor = await this.prisma.doctor.findUnique({
        where: { userId },
      });

      if (!doctor) {
        throw new ForbiddenException(
          'Solo los doctores pueden crear prescripciones',
        );
      }

      const patient = await this.prisma.patient.findUnique({
        where: { id: createDto.patientId },
      });

      if (!patient) {
        throw new NotFoundException('Paciente no encontrado');
      }

      const code = `RX-${nanoid(10).toUpperCase()}`;

      const prescription = await this.prisma.prescription.create({
        data: {
          code,
          notes: createDto.notes,
          authorId: doctor.id,
          patientId: createDto.patientId,
          items: { create: createDto.items },
        },
        include: {
          items: true,
          patient: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
          author: {
            select: {
              id: true,
              specialty: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      });

      this.logger.log(`Prescripción ${code} creada exitosamente`);
      return prescription;
    } catch (error: any) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error al crear prescripción: ${error?.message}`,
        error?.stack,
      );
      throw new InternalServerErrorException('Error al crear prescripción');
    }
  }

  async getPrescriptions(
    userId: string,
    mine: boolean = false,
    status?: PrescriptionStatus,
    from?: string,
    to?: string,
    page: number = 1,
    limit: number = 10,
    order: 'asc' | 'desc' = 'desc',
  ) {
    try {
      this.logger.log(
        `Doctor ${userId} obteniendo prescripciones - mine: ${mine}, status: ${status}`,
      );

      const doctor = await this.prisma.doctor.findUnique({
        where: { userId },
      });

      if (!doctor) {
        throw new ForbiddenException(
          'Solo los doctores pueden ver prescripciones',
        );
      }

      const skip = (page - 1) * limit;

      const where: any = {};

      if (mine) where.authorId = doctor.id;
      if (status) where.status = status;

      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const [prescriptions, total] = await Promise.all([
        this.prisma.prescription.findMany({
          where,
          skip,
          take: limit,
          include: {
            items: true,
            patient: {
              select: {
                id: true,
                user: { select: { name: true, email: true } },
              },
            },
            author: {
              select: {
                id: true,
                specialty: true,
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: order },
        }),
        this.prisma.prescription.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: prescriptions,
        meta: { total, page, limit, totalPages },
      };
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;

      this.logger.error(
        `Error al obtener prescripciones: ${error?.message}`,
        error?.stack,
      );
      throw new InternalServerErrorException('Error al obtener prescripciones');
    }
  }

  async getPrescriptionById(userId: string, prescriptionId: string) {
    try {
      this.logger.log(
        `Usuario ${userId} obteniendo prescripción ${prescriptionId}`,
      );

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { doctor: true, patient: true },
      });

      if (!user) throw new ForbiddenException('Usuario no encontrado');

      const isAdmin = user.role === 'admin';
      const isDoctor = !!user.doctor;
      const isPatient = !!user.patient;

      if (!isAdmin && !isDoctor && !isPatient) {
        throw new ForbiddenException(
          'Solo doctores, pacientes y administradores pueden ver prescripciones',
        );
      }

      const prescription = await this.prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          items: true,
          patient: {
            select: {
              id: true,
              birthDate: true,
              user: { select: { name: true, email: true } },
            },
          },
          author: {
            select: {
              id: true,
              specialty: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      });

      if (!prescription)
        throw new NotFoundException('Prescripción no encontrada');

      if (
        isPatient &&
        user.patient &&
        prescription.patientId !== user.patient.id
      ) {
        throw new ForbiddenException(
          'No puedes acceder a una prescripción que no es tuya',
        );
      }

      return prescription;
    } catch (error: any) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error al obtener prescripción: ${error?.message}`,
        error?.stack,
      );
      throw new InternalServerErrorException('Error al obtener prescripción');
    }
  }

  async getMyPrescriptions(
    userId: string,
    status?: PrescriptionStatus,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      this.logger.log(
        `Paciente ${userId} obteniendo sus prescripciones - status: ${status}`,
      );

      const patient = await this.prisma.patient.findUnique({
        where: { userId },
      });

      if (!patient) {
        throw new ForbiddenException(
          'Solo los pacientes pueden ver sus prescripciones',
        );
      }

      const skip = (page - 1) * limit;

      const where: any = { patientId: patient.id };
      if (status) where.status = status;

      const [prescriptions, total] = await Promise.all([
        this.prisma.prescription.findMany({
          where,
          skip,
          take: limit,
          include: {
            items: true,
            author: {
              select: {
                id: true,
                specialty: true,
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.prescription.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: prescriptions,
        meta: { total, page, limit, totalPages },
      };
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;

      this.logger.error(
        `Error al obtener prescripciones del paciente: ${error?.message}`,
        error?.stack,
      );
      throw new InternalServerErrorException('Error al obtener prescripciones');
    }
  }

  async consumePrescription(userId: string, prescriptionId: string) {
    try {
      this.logger.log(
        `Paciente ${userId} marcando prescripción ${prescriptionId} como consumida`,
      );

      const patient = await this.prisma.patient.findUnique({
        where: { userId },
      });

      if (!patient) {
        throw new ForbiddenException(
          'Solo los pacientes pueden consumir prescripciones',
        );
      }

      const prescription = await this.prisma.prescription.findUnique({
        where: { id: prescriptionId },
      });

      if (!prescription)
        throw new NotFoundException('Prescripción no encontrada');

      if (prescription.patientId !== patient.id) {
        throw new ForbiddenException(
          'No puedes tener acceso una prescripción que no es tuya',
        );
      }

      if (prescription.status === PrescriptionStatus.consumed) {
        throw new ForbiddenException('Esta prescripción ya fue consumida');
      }

      const updatedPrescription = await this.prisma.prescription.update({
        where: { id: prescriptionId },
        data: { status: PrescriptionStatus.consumed, consumedAt: new Date() },
        include: {
          items: true,
          author: {
            select: {
              id: true,
              specialty: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      });

      this.logger.log(`Prescripción ${prescriptionId} marcada como consumida`);
      return updatedPrescription;
    } catch (error: any) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error al consumir prescripción: ${error?.message}`,
        error?.stack,
      );
      throw new InternalServerErrorException('Error al consumir prescripción');
    }
  }

  // ✅ PDF B/N EN TABLAS + TÍTULOS A LA IZQUIERDA
  async generatePrescriptionPdf(
    userId: string,
    prescriptionId: string,
    res: Response,
  ): Promise<void> {
    try {
      this.logger.log(
        `Generando PDF de prescripción ${prescriptionId} para user ${userId}`,
      );

      // 1) Usuario y rol
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { patient: true },
      });

      if (!user) throw new ForbiddenException('Usuario no encontrado');

      const isAdmin = user.role === 'admin';
      const isPatient = !!user.patient;

      if (!isAdmin && !isPatient) {
        throw new ForbiddenException('No autorizado para descargar PDF');
      }

      // 2) Prescripción completa
      const prescription = await this.prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          items: true,
          patient: {
            select: {
              id: true,
              birthDate: true,
              user: { select: { name: true, email: true } },
            },
          },
          author: {
            select: {
              id: true,
              specialty: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      });

      if (!prescription)
        throw new NotFoundException('Prescripción no encontrada');

      // 3) Si es paciente, debe ser dueña
      if (
        !isAdmin &&
        user.patient &&
        prescription.patientId !== user.patient.id
      ) {
        throw new ForbiddenException('No autorizado o no es tu receta');
      }

      // 4) Headers HTTP
      const code = prescription.code ?? prescription.id;
      const filename = `prescripcion-${code}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      // 5) Helpers
      const pad2 = (n: number) => String(n).padStart(2, '0');
      const fmtDate = (d?: Date | null) => {
        if (!d) return '—';
        const dd = pad2(d.getDate());
        const mm = pad2(d.getMonth() + 1);
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${dd}/${mm}/${yyyy}, ${hh}:${mi}:${ss}`;
      };

      const safe = (v?: any) =>
        v === null || v === undefined || v === '' ? '—' : String(v);

      // 6) PDF
      const doc = new PDFDocument({ size: 'A4', margin: 48 });
      doc.pipe(res);

      // B/N
      doc.fillColor('#000000');
      doc.strokeColor('#000000');
      doc.lineWidth(0.7);

      const layout = () => {
        const left = doc.page.margins.left;
        const right = doc.page.width - doc.page.margins.right;
        const bottom = doc.page.height - doc.page.margins.bottom;
        const w = right - left;
        return { left, right, bottom, w };
      };

      const ensureSpace = (need: number) => {
        const { bottom } = layout();
        if (doc.y + need > bottom) {
          doc.addPage();
          drawTitle();
        }
      };

      const hLine = () => {
        const { left, right } = layout();
        const y = doc.y;
        doc.moveTo(left, y).lineTo(right, y).stroke();
      };

      const drawTitle = () => {
        const { left, w } = layout();
        doc
          .font('Helvetica-Bold')
          .fontSize(18)
          .text('Prescripción médica', left, doc.y, {
            width: w,
            align: 'center',
          });
        doc.moveDown(0.3);
        hLine();
        doc.moveDown(0.8);
      };

      const section = (title: string) => {
        const { left, w } = layout();
        ensureSpace(44);

        doc.font('Helvetica-Bold').fontSize(12).text(title, left, doc.y, {
          width: w,
          align: 'left',
        });
        doc.moveDown(0.2);
        hLine();
        doc.moveDown(0.6);
      };

      // Tabla Campo | Valor
      const drawKVTable = (rows: Array<[string, string]>) => {
        const { left, w } = layout();
        const pad = 6;
        const col1 = Math.floor(w * 0.28);
        const col2 = w - col1;

        for (const [k, v] of rows) {
          doc.font('Helvetica').fontSize(10);
          const hVal = doc.heightOfString(v, { width: col2 - pad * 2 });

          doc.font('Helvetica-Bold').fontSize(10);
          const hKey = doc.heightOfString(k, { width: col1 - pad * 2 });

          const rowH = Math.max(hKey, hVal) + pad * 2;

          ensureSpace(rowH + 6);

          const y = doc.y;

          doc.rect(left, y, col1, rowH).stroke();
          doc.rect(left + col1, y, col2, rowH).stroke();

          doc.font('Helvetica-Bold').fontSize(10);
          doc.text(k, left + pad, y + pad, {
            width: col1 - pad * 2,
            align: 'left',
          });

          doc.font('Helvetica').fontSize(10);
          doc.text(v, left + col1 + pad, y + pad, {
            width: col2 - pad * 2,
            align: 'left',
          });

          doc.y = y + rowH;
        }

        doc.moveDown(0.8);
      };

      // Tabla de medicamentos
      const drawItemsTable = (items: any[]) => {
        const { left, w, bottom } = layout();
        const pad = 6;

        // # | Medicamento | Dosis | Cant. | Instrucciones
        const c0 = 22;
        const c2 = 70;
        const c3 = 60;
        const c1 = 130;
        const c4 = w - (c0 + c1 + c2 + c3);

        const headerH = 22;

        const drawHeaderRow = () => {
          ensureSpace(headerH + 6);
          const y = doc.y;

          doc.rect(left, y, c0, headerH).stroke();
          doc.rect(left + c0, y, c1, headerH).stroke();
          doc.rect(left + c0 + c1, y, c2, headerH).stroke();
          doc.rect(left + c0 + c1 + c2, y, c3, headerH).stroke();
          doc.rect(left + c0 + c1 + c2 + c3, y, c4, headerH).stroke();

          doc.font('Helvetica-Bold').fontSize(10);
          doc.text('#', left + pad, y + 6, {
            width: c0 - pad * 2,
            align: 'left',
          });
          doc.text('Medicamento', left + c0 + pad, y + 6, {
            width: c1 - pad * 2,
            align: 'left',
          });
          doc.text('Dosis', left + c0 + c1 + pad, y + 6, {
            width: c2 - pad * 2,
            align: 'left',
          });
          doc.text('Cant.', left + c0 + c1 + c2 + pad, y + 6, {
            width: c3 - pad * 2,
            align: 'left',
          });
          doc.text('Instrucciones', left + c0 + c1 + c2 + c3 + pad, y + 6, {
            width: c4 - pad * 2,
            align: 'left',
          });

          doc.y = y + headerH;
        };

        drawHeaderRow();

        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const idx = String(i + 1);
          const name = safe(it.name);
          const dosage = safe(it.dosage);
          const qty =
            it.quantity !== null && it.quantity !== undefined
              ? safe(it.quantity)
              : '—';
          const instructions = safe(it.instructions);

          doc.font('Helvetica').fontSize(10);
          const hIdx = doc.heightOfString(idx, { width: c0 - pad * 2 });
          const hName = doc.heightOfString(name, { width: c1 - pad * 2 });
          const hDose = doc.heightOfString(dosage, { width: c2 - pad * 2 });
          const hQty = doc.heightOfString(qty, { width: c3 - pad * 2 });
          const hIns = doc.heightOfString(instructions, {
            width: c4 - pad * 2,
          });

          const rowH = Math.max(hIdx, hName, hDose, hQty, hIns) + pad * 2;

          if (doc.y + rowH > bottom) {
            doc.addPage();
            drawTitle();
            section('Medicamentos formulados');
            drawHeaderRow();
          }

          const y = doc.y;

          doc.rect(left, y, c0, rowH).stroke();
          doc.rect(left + c0, y, c1, rowH).stroke();
          doc.rect(left + c0 + c1, y, c2, rowH).stroke();
          doc.rect(left + c0 + c1 + c2, y, c3, rowH).stroke();
          doc.rect(left + c0 + c1 + c2 + c3, y, c4, rowH).stroke();

          doc.font('Helvetica').fontSize(10);
          doc.text(idx, left + pad, y + pad, {
            width: c0 - pad * 2,
            align: 'left',
          });
          doc.text(name, left + c0 + pad, y + pad, {
            width: c1 - pad * 2,
            align: 'left',
          });
          doc.text(dosage, left + c0 + c1 + pad, y + pad, {
            width: c2 - pad * 2,
            align: 'left',
          });
          doc.text(qty, left + c0 + c1 + c2 + pad, y + pad, {
            width: c3 - pad * 2,
            align: 'left',
          });
          doc.text(instructions, left + c0 + c1 + c2 + c3 + pad, y + pad, {
            width: c4 - pad * 2,
            align: 'left',
          });

          doc.y = y + rowH;
        }

        doc.moveDown(0.6);
      };

      // ===== Render =====
      drawTitle();

      section('Resumen');
      drawKVTable([
        ['Código', safe(prescription.code)],
        ['ID', safe(prescription.id)],
        ['Estado', safe(prescription.status)],
        ['Fecha creación', fmtDate(prescription.createdAt as any)],
        ['Fecha consumo', fmtDate(prescription.consumedAt as any)],
      ]);

      section('Paciente');
      drawKVTable([
        ['Nombre', safe(prescription.patient?.user?.name)],
        ['Email', safe(prescription.patient?.user?.email)],
        [
          'Patient ID',
          safe(prescription.patient?.id ?? prescription.patientId),
        ],
        ['Nacimiento', fmtDate(prescription.patient?.birthDate ?? null)],
      ]);

      section('Doctor');
      drawKVTable([
        ['Nombre', safe(prescription.author?.user?.name)],
        ['Email', safe(prescription.author?.user?.email)],
        ['Doctor ID', safe(prescription.author?.id ?? prescription.authorId)],
        ['Especialidad', safe(prescription.author?.specialty)],
      ]);

      if (prescription.notes && prescription.notes.trim() !== '') {
        section('Notas');
        drawKVTable([['Notas', safe(prescription.notes)]]);
      }

      section('Medicamentos formulados');
      if (!prescription.items || prescription.items.length === 0) {
        doc.font('Helvetica').fontSize(10).text('Sin medicamentos.');
      } else {
        drawItemsTable(prescription.items);
      }

      doc.end();
    } catch (error: any) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error al generar PDF: ${error?.message}`,
        error?.stack,
      );
      throw new InternalServerErrorException('Error al generar PDF');
    }
  }

  async getAllPrescriptions(
    status?: PrescriptionStatus,
    doctorId?: string,
    patientId?: string,
    from?: string,
    to?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      this.logger.log(
        `Admin obteniendo prescripciones - status: ${status}, doctorId: ${doctorId}, patientId: ${patientId}`,
      );

      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;
      if (doctorId) where.authorId = doctorId;
      if (patientId) where.patientId = patientId;

      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const [prescriptions, total] = await Promise.all([
        this.prisma.prescription.findMany({
          where,
          skip,
          take: limit,
          include: {
            items: true,
            patient: {
              select: {
                id: true,
                user: { select: { name: true, email: true } },
              },
            },
            author: {
              select: {
                id: true,
                specialty: true,
                user: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.prescription.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: prescriptions,
        meta: { total, page, limit, totalPages },
      };
    } catch (error: any) {
      this.logger.error(
        `Error al obtener prescripciones (admin): ${error?.message}`,
        error?.stack,
      );
      throw new InternalServerErrorException('Error al obtener prescripciones');
    }
  }
}
