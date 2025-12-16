<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

API para autenticación y gestión de usuarios (admin), doctores, pacientes y prescripciones .
Incluye Swagger, seed con datos de prueba y paginación, siguiendo el flujo de roles (doctor/patient/admin).

## 🚀 Despliegue

- **API (Railway):** https://backendpt-production.up.railway.app/
- **Swagger (Docs):** https://backendpt-production.up.railway.app/docs
- **Front:** https://frontend-pt-steel.vercel.app/

## 🏗️ Arquitectura del proyecto

El backend está organizado siguiendo la arquitectura típica de **NestJS por módulos**, separando responsabilidades en:

- **Controllers**: exponen endpoints HTTP y validan/reciben DTOs.
- **Services**: contienen la lógica de negocio.
- **Modules**: agrupan controllers + services + providers.
- **Prisma**: capa de acceso a datos (PostgreSQL) centralizada en `PrismaService`.
- **Common**: componentes transversales (interceptors/filters) para estandarizar respuestas y errores.
- **Auth**: autenticación JWT, guards, strategies y helpers para RBAC.

### Estructura de carpetas

```txt
prescriptions-api/
├─ prisma/
│  ├─ migrations/              # Migraciones Prisma
│  ├─ schema.prisma            # Modelo de datos Prisma
│  └─ seed.ts                  # Seed con datos de prueba
│
├─ src/
│  ├─ auth/
│  │  ├─ decorators/           # Decoradores (por ejemplo, para roles)
│  │  ├─ dto/                  # DTOs de auth
│  │  ├─ guards/               # Guards de autenticación/autorización
│  │  ├─ strategies/           # Strategies JWT (access/refresh)
│  │  ├─ auth.controller.ts    # Endpoints de autenticación
│  │  ├─ auth.module.ts
│  │  └─ auth.service.ts
│  │
│  ├─ common/
│  │  ├─ filters/              # Filtros globales (errores)
│  │  └─ interceptors/         # Interceptors (respuesta estándar, etc.)
│  │
│  ├─ doctor/
│  │  ├─ doctor.controller.ts  # Endpoints de doctores
│  │  ├─ doctor.module.ts
│  │  └─ doctor.service.ts
│  │
│  ├─ patients/
│  │  ├─ patients.controller.ts # Endpoints de pacientes
│  │  ├─ patients.module.ts
│  │  └─ patients.service.ts
│  │
│  ├─ prescriptions/
│  │  ├─ dto/                   # DTOs de prescripciones
│  │  ├─ prescriptions.controller.ts # Endpoints de prescripciones (+ PDF)
│  │  ├─ prescriptions.module.ts
│  │  └─ prescriptions.service.ts    # Lógica (incluye generación PDF)
│  │
│  ├─ prisma/
│  │  ├─ prisma.module.ts        # Módulo Prisma
│  │  └─ prisma.service.ts       # PrismaService (DB)
│  │
│  ├─ users/
│  │  └─ ...                     # Módulo de usuarios (admin)
│  │
│  ├─ app.controller.ts
│  ├─ app.controller.spec.ts
│  ├─ app.module.ts
│  ├─ app.service.ts
│  └─ main.ts                    # Bootstrap + config global
│
├─ dist/                         # Build compilado
├─ docker-compose.yml            # PostgreSQL en local con Docker
├─ nixpacks.toml                 # Config de build/deploy (Railway)
├─ package.json
└─ README.md
```

## 📚 Documentación de Endpoints (Swagger)

- **Local:** http://localhost:4000/docs
- **Producción (Railway):** https://backendpt-production.up.railway.app/docs

En Swagger encontrarás los módulos principales:

-Auth
-Users (admin)
-Doctors
-Patients
-Prescriptions

## ✅ Requisitos

- Node.js (recomendado LTS)
- npm
- PostgreSQL (local o Docker)

---

## 🔐 Variables de entorno

Crea un archivo `.env` en la raíz:

```env
# Server
PORT=4000

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/prescriptions?schema=public"

# JWT
JWT_ACCESS_SECRET="replace_me_access_secret"
JWT_REFRESH_SECRET="replace_me_refresh_secret"
JWT_ACCESS_EXPIRES_IN_SEC=900
JWT_REFRESH_EXPIRES_IN_SEC=604800
```

## PostgreSQL con Docker (recomendado)

Si ya tienes docker-compose.yml, solo ejecuta:

```bash
$ docker compose up -d
```

Si no lo tienes, este es un ejemplo funcional:

docker-compose.yml

```yaml
version: '3.9'

services:
  db:
    image: postgres:16
    container_name: prescriptions-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: prescriptions
    ports:
      - '5432:5432'
    volumes:
      - prescriptions_db_data:/var/lib/postgresql/data

volumes:
  prescriptions_db_data:
```

Para bajar docker:

## Deployment

```bash
$ docker compose down
```

## PostgreSQL instalado localmente

1. Crea una base de datos (ej: prescriptions-api)
2. Ajusta tu DATABASE_URL en env.

## Intalación

```bash
$ npm install
```

## Migraciones y Seed

1.Migraciones

Para aplicar migraciones:

```bash
$ npx prisma migrate deploy
```

Si estás en local y necesitas crear migraciones:

```bash
$ npx prisma migrate dev
```

2. Seed (Limpia y carga datos)

```bash
$ npm run seed
```

El seed:
-borra datos existentes (tablas relacionadas)
-crea usuarios de prueba (admin/doctor/pacientes)
-crea prescripciones con estados pending y consumed

👤 Cuentas de prueba
-Admin: admin@test.com / admin123
-Doctor: dr@test.com / dr123
-Paciente A: patient@test.com / patient123
-Paciente B: patient2@test.com / patient123

## Decisiones tecnicas

Autenticación (JWT + Refresh)

-login devuelve accessToken + refreshToken.

-accessToken para consumir endpoints protegidos.

-refreshToken para renovar sesión.

RBAC (Roles)

-Control de acceso por roles usando guards/decorators:

-admin: gestión de usuarios y endpoints administrativos.

-doctor: crea y consulta prescripciones (propias).

-patient: consulta sus prescripciones y puede consumirlas.

-Respuesta estándar (TransformInterceptor)

La API responde en un wrapper consistente:

```json
{
  "statusCode": 200,
  "timestamp": "2025-12-15T00:00:00.000Z",
  "path": "/ruta",
  "method": "GET",
  "data": {}
}
```

Manejo centralizado de errores (AllExceptionsFilter)
Errores normalizados y log del endpoint que falló.

Paginación
Listados soportan page y limit, devolviendo meta:

```json
{
  "data": [],
  "meta": { "total": 8, "page": 1, "limit": 10, "totalPages": 1 }
}
```

Generación de PDF

-Endpoint de descarga: GET /prescriptions/:id/pdf
-Genera PDF con pdfkit
-Autorización: patient (solo dueño) y admin

## Notas rapidas

Notas rápidas de uso

1. Levanta la DB (Docker o local)
2. Configura .env
3. Ejecuta migraciones: npx prisma migrate deploy
4. Ejecuta seed: npm run seed
5. Corre la API: npm run start:dev
6. Abre Swagger y prueba:
   -haz login con una cuenta del seed
   -usa Authorize pegando el Bearer <accessToken>
   -valida endpoints según rol

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
