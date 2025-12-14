import {
  PrismaClient,
  Role,
  PrescriptionStatus,
  type Prescription,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpieza (orden inverso por relaciones)
  await prisma.$transaction([
    prisma.prescriptionItem.deleteMany(),
    prisma.prescription.deleteMany(),
    prisma.doctor.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('✅ Base de datos limpiada');

  // Passwords
  const saltRounds = 10;
  const hashedAdminPassword = await bcrypt.hash('admin123', saltRounds);
  const hashedDoctorPassword = await bcrypt.hash('dr123', saltRounds);
  const hashedPatientPassword = await bcrypt.hash('patient123', saltRounds);
  const hashedPatient2Password = await bcrypt.hash('patient123', saltRounds);

  // Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: hashedAdminPassword,
      name: 'Admin Prueba',
      role: Role.admin,
    },
    select: { id: true, email: true, role: true },
  });
  console.log('👤 Administrador creado:', admin.email);

  // Doctor
  const doctorUser = await prisma.user.create({
    data: {
      email: 'dr@test.com',
      password: hashedDoctorPassword,
      name: 'Doctor Prueba',
      role: Role.doctor,
      doctor: {
        create: {
          specialty: 'Medicina general',
        },
      },
    },
    include: { doctor: true },
  });
  console.log('👨‍⚕️ Doctor creado:', doctorUser.email);

  if (!doctorUser.doctor) {
    throw new Error('No se creó la relación doctor correctamente.');
  }

  // Paciente A
  const patientUserA = await prisma.user.create({
    data: {
      email: 'patient@test.com',
      password: hashedPatientPassword,
      name: 'Paciente Prueba A',
      role: Role.patient,
      patient: {
        create: {
          birthDate: new Date('1995-03-22'),
          phone: '+57 300 000 0001',
        },
      },
    },
    include: { patient: true },
  });
  console.log('👩 Paciente A creado:', patientUserA.email);

  if (!patientUserA.patient) {
    throw new Error('No se creó la relación patient (A) correctamente.');
  }

  // Paciente B (para probar acceso indebido)
  const patientUserB = await prisma.user.create({
    data: {
      email: 'patient2@test.com',
      password: hashedPatient2Password,
      name: 'Paciente Prueba B',
      role: Role.patient,
      patient: {
        create: {
          birthDate: new Date('1998-07-10'),
          phone: '+57 300 000 0002',
        },
      },
    },
    include: { patient: true },
  });
  console.log('👩 Paciente B creado:', patientUserB.email);

  if (!patientUserB.patient) {
    throw new Error('No se creó la relación patient (B) correctamente.');
  }

  // Medicamentos (mismo shape que tu DTO / Prisma)
  const meds = [
    {
      name: 'Ibuprofeno',
      dosage: '400mg',
      quantity: 12,
      instructions: '1 cada 8 horas',
    },
    {
      name: 'Omeprazol',
      dosage: '20mg',
      quantity: 14,
      instructions: '1 en ayunas',
    },
    {
      name: 'Amoxicilina',
      dosage: '500mg',
      quantity: 21,
      instructions: '1 cada 8 horas por 7 días',
    },
    {
      name: 'Losartán',
      dosage: '50mg',
      quantity: 60,
      instructions: '1 cada 12 horas',
    },
    {
      name: 'Cetirizina',
      dosage: '10mg',
      quantity: 10,
      instructions: '1 al día (noche)',
    },
  ];

  // 👇 IMPORTANTÍSIMO: tipado para que NO sea never[]
  const prescriptions: Prescription[] = [];

  // Helper
  const createRx = async (params: {
    code: string;
    status: PrescriptionStatus;
    notes: string;
    patientId: string;
    authorId: string;
    consumedAt?: Date;
    items: Array<{
      name: string;
      dosage?: string | null;
      quantity?: number | null;
      instructions?: string | null;
    }>;
  }) => {
    return prisma.prescription.create({
      data: {
        code: params.code,
        status: params.status,
        notes: params.notes,
        consumedAt: params.consumedAt ?? null,
        patientId: params.patientId,
        authorId: params.authorId,
        items: {
          create: params.items,
        },
      },
    });
  };

  // ===== 5–10 prescripciones (varias pending y consumed) =====
  // Paciente A (5)
  prescriptions.push(
    await createRx({
      code: 'RX-001-2025',
      status: PrescriptionStatus.pending,
      notes: 'Dolor muscular - control en 1 semana',
      patientId: patientUserA.patient.id,
      authorId: doctorUser.doctor.id,
      items: [meds[0], meds[1]],
    }),
  );

  prescriptions.push(
    await createRx({
      code: 'RX-002-2025',
      status: PrescriptionStatus.consumed,
      notes: 'Gastritis - tratamiento completado',
      patientId: patientUserA.patient.id,
      authorId: doctorUser.doctor.id,
      consumedAt: new Date('2025-12-05'),
      items: [meds[1]],
    }),
  );

  prescriptions.push(
    await createRx({
      code: 'RX-003-2025',
      status: PrescriptionStatus.pending,
      notes: 'Infección respiratoria - seguir indicaciones',
      patientId: patientUserA.patient.id,
      authorId: doctorUser.doctor.id,
      items: [meds[2]],
    }),
  );

  prescriptions.push(
    await createRx({
      code: 'RX-004-2025',
      status: PrescriptionStatus.consumed,
      notes: 'Alergia estacional - resuelto',
      patientId: patientUserA.patient.id,
      authorId: doctorUser.doctor.id,
      consumedAt: new Date('2025-12-01'),
      items: [meds[4]],
    }),
  );

  prescriptions.push(
    await createRx({
      code: 'RX-005-2025',
      status: PrescriptionStatus.pending,
      notes: 'Hipertensión - control mensual',
      patientId: patientUserA.patient.id,
      authorId: doctorUser.doctor.id,
      items: [meds[3]],
    }),
  );

  // Paciente B (3) -> esto es lo que te permite probar “A no ve las de B”
  prescriptions.push(
    await createRx({
      code: 'RX-006-2025',
      status: PrescriptionStatus.pending,
      notes: 'Dolor de cabeza - observación',
      patientId: patientUserB.patient.id,
      authorId: doctorUser.doctor.id,
      items: [meds[0]],
    }),
  );

  prescriptions.push(
    await createRx({
      code: 'RX-007-2025',
      status: PrescriptionStatus.pending,
      notes: 'Gastritis - iniciar tratamiento',
      patientId: patientUserB.patient.id,
      authorId: doctorUser.doctor.id,
      items: [meds[1]],
    }),
  );

  prescriptions.push(
    await createRx({
      code: 'RX-008-2025',
      status: PrescriptionStatus.consumed,
      notes: 'Antibiótico completado',
      patientId: patientUserB.patient.id,
      authorId: doctorUser.doctor.id,
      consumedAt: new Date('2025-11-20'),
      items: [meds[2]],
    }),
  );

  const pendingCount = prescriptions.filter(
    (p) => p.status === PrescriptionStatus.pending,
  ).length;
  const consumedCount = prescriptions.filter(
    (p) => p.status === PrescriptionStatus.consumed,
  ).length;

  console.log(`💊 ${prescriptions.length} prescripciones creadas`);
  console.log(`   - pending:  ${pendingCount}`);
  console.log(`   - consumed: ${consumedCount}`);

  console.log('\n🔐 Credenciales de acceso:');
  console.log('  Admin:     admin@test.com   / admin123');
  console.log('  Doctor:    dr@test.com      / dr123');
  console.log('  Paciente A patient@test.com / patient123');
  console.log('  Paciente B patient2@test.com / patient123');

  console.log('\n✨ Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
