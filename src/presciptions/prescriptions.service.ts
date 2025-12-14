import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ElevenlabsService } from '../integrations/elevenlabs.service';
import { OpenaiService } from '../integrations/openai.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { PrescriptionStatus } from '@prisma/client';
import { nanoid } from 'nanoid';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private elevenlabsService: ElevenlabsService,
    private openaiService: OpenaiService,
  ) {}

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
          items: {
            create: createDto.items,
          },
        },
        include: {
          items: true,
          patient: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          author: {
            select: {
              id: true,
              specialty: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Prescripción ${code} creada exitosamente`);

      return prescription;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error al crear prescripción: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al crear prescripción');
    }
  }

  async createPrescriptionFromAudio(
    userId: string,
    patientId: string,
    audioBuffer: Buffer,
    filename: string,
  ) {
    try {
      this.logger.log(
        `Doctor ${userId} creando prescripción desde audio para paciente ${patientId}`,
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
        where: { id: patientId },
      });

      if (!patient) {
        throw new NotFoundException('Paciente no encontrado');
      }

      this.logger.log('Transcribiendo audio...');
      const transcribedText = await this.elevenlabsService.transcribe(
        audioBuffer,
        filename,
      );

      if (!transcribedText || transcribedText.trim() === '') {
        throw new BadRequestException(
          'No se pudo transcribir el audio o está vacío',
        );
      }

      this.logger.log(`Texto transcrito: ${transcribedText}`);

      this.logger.log('Estructurando prescripción con IA...');
      const structuredData =
        await this.openaiService.structurePrescription(transcribedText);

      if (!structuredData.items || structuredData.items.length === 0) {
        throw new BadRequestException(
          'No se pudieron extraer medicamentos del audio',
        );
      }

      this.logger.log(`Items extraídos: ${structuredData.items.length}`);

      const code = `RX-${nanoid(10).toUpperCase()}`;

      const prescription = await this.prisma.prescription.create({
        data: {
          code,
          notes:
            structuredData.notes ||
            `Prescripción creada por audio. Transcripción: ${transcribedText}`,
          authorId: doctor.id,
          patientId: patientId,
          items: {
            create: structuredData.items,
          },
        },
        include: {
          items: true,
          patient: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          author: {
            select: {
              id: true,
              specialty: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Prescripción ${code} creada exitosamente desde audio`);

      return {
        ...prescription,
        transcription: transcribedText,
        aiProcessed: true,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error al crear prescripción desde audio: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error al procesar el audio y crear la prescripción: ' + error.message,
      );
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

      if (mine) {
        where.authorId = doctor.id;
      }

      if (status) {
        where.status = status;
      }

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
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            author: {
              select: {
                id: true,
                specialty: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: order,
          },
        }),
        this.prisma.prescription.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: prescriptions,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Error al obtener prescripciones: ${error.message}`,
        error.stack,
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
        include: {
          doctor: true,
          patient: true,
        },
      });

      if (!user) {
        throw new ForbiddenException('Usuario no encontrado');
      }

      const isAdmin = user.role === 'admin';
      const isDoctor = !!user.doctor;
      const isPatient = !!user.patient;

      if (!isAdmin && !isDoctor && !isPatient) {
        throw new ForbiddenException(
          'Solo los doctores, pacientes y administradores pueden ver prescripciones',
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
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          author: {
            select: {
              id: true,
              specialty: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!prescription) {
        throw new NotFoundException('Prescripción no encontrada');
      }

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
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error al obtener prescripción: ${error.message}`,
        error.stack,
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

      const where: any = {
        patientId: patient.id,
      };

      if (status) {
        where.status = status;
      }

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
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.prescription.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: prescriptions,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Error al obtener prescripciones del paciente: ${error.message}`,
        error.stack,
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

      if (!prescription) {
        throw new NotFoundException('Prescripción no encontrada');
      }

      if (prescription.patientId !== patient.id) {
        throw new ForbiddenException(
          'No puedes tener acceso a una prescripción que no es tuya',
        );
      }

      if (prescription.status === PrescriptionStatus.consumed) {
        throw new ForbiddenException('Esta prescripción ya fue consumida');
      }

      const updatedPrescription = await this.prisma.prescription.update({
        where: { id: prescriptionId },
        data: {
          status: PrescriptionStatus.consumed,
          consumedAt: new Date(),
        },
        include: {
          items: true,
          author: {
            select: {
              id: true,
              specialty: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Prescripción ${prescriptionId} marcada como consumida`);

      return updatedPrescription;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(
        `Error al consumir prescripción: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al consumir prescripción');
    }
  }

  // ===== PDF con estilos nuevos =====
  async generatePrescriptionPdf(
    userId: string,
    prescriptionId: string,
    res: Response,
  ) {
    try {
      this.logger.log(
        `Usuario ${userId} generando PDF de prescripción ${prescriptionId}`,
      );

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { patient: true },
      });

      if (!user) throw new ForbiddenException('Usuario no encontrado');

      const isAdmin = user.role === 'admin';
      const isPatient = !!user.patient;

      if (!isAdmin && !isPatient) {
        throw new ForbiddenException(
          'Solo los pacientes y administradores pueden descargar prescripciones',
        );
      }

      const prescription = await this.prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          items: true,
          author: {
            select: {
              id: true,
              specialty: true,
              user: { select: { name: true, email: true } },
            },
          },
          patient: {
            select: {
              id: true,
              birthDate: true,
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

      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=prescripcion-${prescription.code}.pdf`,
      );

      doc.pipe(res);

      // ===== Helpers de estilos =====
      const margin = 50;
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - margin * 2;

      const colors = {
        text: '#111827',
        muted: '#6B7280',
        border: '#E5E7EB',
        bgSoft: '#F9FAFB',
        headerBg: '#111827',
        headerText: '#FFFFFF',
        ok: '#16A34A',
        okBg: '#DCFCE7',
        gray: '#6B7280',
        grayBg: '#F3F4F6',
      };

      const fmtDateTime = (d: Date) =>
        d.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) +
        ' ' +
        d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

      const drawBadge = (
        text: string,
        x: number,
        y: number,
        bg: string,
        fg: string,
      ) => {
        doc.save();
        doc.font('Helvetica-Bold').fontSize(9);

        const paddingX = 8;
        const textW = doc.widthOfString(text);
        const boxW = textW + paddingX * 2;
        const boxH = 16;

        doc.roundedRect(x, y, boxW, boxH, 6).fill(bg);

        doc.fillColor(fg).text(text, x + paddingX, y + 4, { lineBreak: false });

        doc.restore();
        return boxW;
      };

      const drawCard = (
        title: string,
        lines: Array<{ label: string; value: string }>,
      ) => {
        const x = margin;
        const y = doc.y;

        const lineHeight = 14;
        const headerH = 18;
        const padding = 12;
        const bodyH = lines.length * lineHeight;
        const cardH = headerH + padding + bodyH + padding;

        doc.save();
        doc
          .roundedRect(x, y, contentWidth, cardH, 10)
          .fill(colors.bgSoft)
          .strokeColor(colors.border)
          .stroke();

        doc
          .fillColor(colors.text)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(title, x + padding, y + 10);

        let ty = y + headerH + padding - 2;

        doc.font('Helvetica').fontSize(10);

        for (const l of lines) {
          doc
            .fillColor(colors.muted)
            .text(`${l.label}:`, x + padding, ty, { continued: true });
          doc.fillColor(colors.text).text(` ${l.value}`);
          ty += lineHeight;
        }

        doc.restore();
        doc.y = y + cardH + 12;
      };

      const drawSectionTitle = (title: string) => {
        doc
          .fillColor(colors.text)
          .font('Helvetica-Bold')
          .fontSize(12)
          .text(title);

        doc
          .moveDown(0.3)
          .strokeColor(colors.border)
          .lineWidth(1)
          .moveTo(margin, doc.y)
          .lineTo(margin + contentWidth, doc.y)
          .stroke();

        doc.moveDown(0.7);
      };

      // ===== Header =====
      const headerH = 78;
      doc.save();
      doc.rect(0, 0, pageWidth, headerH).fill(colors.headerBg);
      doc.restore();

      doc
        .fillColor(colors.headerText)
        .font('Helvetica-Bold')
        .fontSize(20)
        .text('Prescripción médica', margin, 22, { width: contentWidth });

      doc
        .fillColor('#D1D5DB')
        .font('Helvetica')
        .fontSize(10)
        .text('Documento generado por el sistema', margin, 48, {
          width: contentWidth,
        });

      // Code “pill” (derecha)
      doc.save();
      doc.font('Helvetica-Bold').fontSize(10);
      const codeText = `Código: ${prescription.code}`;
      const codeW = doc.widthOfString(codeText) + 18;
      const codeX = margin + contentWidth - codeW;
      const codeY = 24;

      doc.roundedRect(codeX, codeY, codeW, 26, 10).fill('#1F2937');

      doc
        .fillColor('#FFFFFF')
        .text(codeText, codeX + 9, codeY + 8, { lineBreak: false });
      doc.restore();

      doc.y = headerH + 24;

      // ===== Meta (fecha + estado badge) =====
      const issued = fmtDateTime(new Date(prescription.createdAt));
      doc
        .fillColor(colors.muted)
        .font('Helvetica')
        .fontSize(10)
        .text(`Fecha de emisión: ${issued}`, margin, doc.y);

      const statusText =
        prescription.status === 'consumed' ? 'CONSUMIDA' : 'PENDIENTE';
      const badgeBg =
        prescription.status === 'consumed' ? colors.grayBg : colors.okBg;
      const badgeFg =
        prescription.status === 'consumed' ? colors.gray : colors.ok;

      const badgeY = doc.y - 2;
      const badgeX = margin + contentWidth - 150;
      drawBadge(`Estado: ${statusText}`, badgeX, badgeY, badgeBg, badgeFg);

      doc.moveDown(1.2);

      if (prescription.consumedAt) {
        doc
          .fillColor(colors.muted)
          .font('Helvetica')
          .fontSize(10)
          .text(
            `Fecha de consumo: ${fmtDateTime(new Date(prescription.consumedAt))}`,
            margin,
            doc.y,
          );

        doc.moveDown(1);
      }

      // ===== Cards Doctor / Paciente =====
      drawSectionTitle('Datos');

      drawCard('Doctor', [
        { label: 'Nombre', value: prescription.author.user.name || 'N/A' },
        {
          label: 'Especialidad',
          value: prescription.author.specialty || 'No especificada',
        },
        { label: 'Email', value: prescription.author.user.email || 'N/A' },
      ]);

      const birth = prescription.patient.birthDate
        ? new Date(prescription.patient.birthDate).toLocaleDateString('es-ES')
        : 'No registrada';

      drawCard('Paciente', [
        { label: 'Nombre', value: prescription.patient.user.name || 'N/A' },
        { label: 'Email', value: prescription.patient.user.email || 'N/A' },
        { label: 'Fecha de nacimiento', value: birth },
      ]);

      // ===== Tabla Medicamentos =====
      drawSectionTitle('Medicamentos prescritos');

      const tableX = margin;
      let tableY = doc.y;
      const tableW = contentWidth;

      const colName = Math.floor(tableW * 0.35);
      const colDosage = Math.floor(tableW * 0.22);
      const colQty = Math.floor(tableW * 0.12);
      const colInstr = tableW - (colName + colDosage + colQty);

      const rowPad = 8;

      const drawTableHeader = () => {
        doc.save();
        doc.roundedRect(tableX, tableY, tableW, 26, 8).fill('#111827');

        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10);

        doc.text('Medicamento', tableX + rowPad, tableY + 8, {
          width: colName - rowPad,
        });
        doc.text('Dosis', tableX + colName + rowPad, tableY + 8, {
          width: colDosage - rowPad,
        });
        doc.text('Cant.', tableX + colName + colDosage + rowPad, tableY + 8, {
          width: colQty - rowPad,
        });
        doc.text(
          'Instrucciones',
          tableX + colName + colDosage + colQty + rowPad,
          tableY + 8,
          {
            width: colInstr - rowPad,
          },
        );

        doc.restore();
        tableY += 32;
      };

      const ensureSpace = (needed: number) => {
        if (tableY + needed > doc.page.height - 90) {
          doc.addPage();
          tableY = margin;
          drawTableHeader();
        }
      };

      drawTableHeader();

      doc.font('Helvetica').fontSize(10).fillColor(colors.text);

      prescription.items.forEach((item, idx) => {
        const name = item.name ?? '';
        const dosage = item.dosage ?? '-';
        const qty = item.quantity ? String(item.quantity) : '-';
        const instr = item.instructions ?? '-';

        const hName = doc.heightOfString(name, { width: colName - rowPad * 2 });
        const hDos = doc.heightOfString(dosage, {
          width: colDosage - rowPad * 2,
        });
        const hQty = doc.heightOfString(qty, { width: colQty - rowPad * 2 });
        const hIns = doc.heightOfString(instr, {
          width: colInstr - rowPad * 2,
        });

        const rowH = Math.max(hName, hDos, hQty, hIns) + rowPad * 2;

        ensureSpace(rowH + 4);

        doc.save();
        doc
          .roundedRect(tableX, tableY, tableW, rowH, 8)
          .fill(idx % 2 === 0 ? '#FFFFFF' : colors.bgSoft)
          .strokeColor(colors.border)
          .stroke();
        doc.restore();

        const textY = tableY + rowPad;
        doc.fillColor(colors.text);

        doc.text(name, tableX + rowPad, textY, { width: colName - rowPad * 2 });
        doc.text(dosage, tableX + colName + rowPad, textY, {
          width: colDosage - rowPad * 2,
        });
        doc.text(qty, tableX + colName + colDosage + rowPad, textY, {
          width: colQty - rowPad * 2,
        });
        doc.text(instr, tableX + colName + colDosage + colQty + rowPad, textY, {
          width: colInstr - rowPad * 2,
        });

        tableY += rowH + 6;
      });

      doc.y = tableY + 6;

      // ===== Notas =====
      if (prescription.notes) {
        drawSectionTitle('Notas / Diagnóstico');

        const x = margin;
        const pad = 12;
        const notesText = prescription.notes;

        const notesH =
          doc.heightOfString(notesText, { width: contentWidth - pad * 2 }) +
          pad * 2;

        if (doc.y + notesH > doc.page.height - 90) {
          doc.addPage();
          doc.y = margin;
        }

        doc.save();
        doc
          .roundedRect(x, doc.y, contentWidth, notesH, 10)
          .fill(colors.bgSoft)
          .strokeColor(colors.border)
          .stroke();

        doc.fillColor(colors.text).font('Helvetica').fontSize(10);
        doc.text(notesText, x + pad, doc.y + pad, {
          width: contentWidth - pad * 2,
        });

        doc.restore();
        doc.y = doc.y + notesH + 12;
      }

      // ===== Footer =====
      const footerY = doc.page.height - 70;

      doc
        .strokeColor(colors.border)
        .moveTo(margin, footerY)
        .lineTo(margin + contentWidth, footerY)
        .stroke();

      doc
        .fillColor(colors.muted)
        .font('Helvetica')
        .fontSize(8)
        .text(
          'Este documento es una prescripción médica. Consérvelo para el suministro de medicamentos.',
          margin,
          footerY + 12,
          { width: contentWidth, align: 'center' },
        );

      doc.text(
        `Generado el ${new Date().toLocaleString('es-ES')}`,
        margin,
        footerY + 26,
        {
          width: contentWidth,
          align: 'center',
        },
      );

      doc.end();

      this.logger.log(
        `PDF generado exitosamente (con estilos nuevos) para prescripción ${prescriptionId}`,
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      )
        throw error;

      this.logger.error(`Error al generar PDF: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Error al generar PDF de prescripción',
      );
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

      if (status) {
        where.status = status;
      }

      if (doctorId) {
        where.authorId = doctorId;
      }

      if (patientId) {
        where.patientId = patientId;
      }

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
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
            author: {
              select: {
                id: true,
                specialty: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.prescription.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: prescriptions,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener prescripciones (admin): ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Error al obtener prescripciones');
    }
  }
}
