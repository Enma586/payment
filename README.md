# Payment Gateway

Un microservicio unificado de pasarela de pagos que abstrae multiples proveedores (PayPal, Stripe) detras de una API REST consistente. Permite crear pagos, consultar estados, procesar reembolsos y recibir notificaciones webhook asincronas con un unico contrato de integracion.

---

## Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Flujo de Pago](#flujo-de-pago)
- [Requisitos](#requisitos)
- [Inicio Rapido](#inicio-rapido)
- [API](#api)
- [Proveedores Soportados](#proveedores-soportados)
- [Variables de Entorno](#variables-de-entorno)
- [Scripts Disponibles](#scripts-disponibles)
- [Pruebas](#pruebas)
- [Despliegue](#despliegue)
- [Estructura del Proyecto](#estructura-del-proyecto)

---

## Arquitectura

```
                     ┌──────────────────────────────────────────────────┐
                     │              Payment Gateway                     │
                     │                                                  │
 Cliente Backend ────┤  POST /api/v1/payments/create                   │
                     │  GET  /api/v1/payments/:id/status               │
                     │  POST /api/v1/payments/:id/refund               │
                     │                                                  │
                     │  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
                     │  │  Routes  │─▶│Controller│─▶│   Services    │  │
                     │  └──────────┘  └──────────┘  └───────┬───────┘  │
                     │                                       │          │
                     │            ┌──────────────────────────┘          │
                     │            │              │                      │
                     │            ▼              ▼                      │
                     │  ┌──────────────┐  ┌──────────────┐             │
                     │  │  PostgreSQL  │  │   Provider   │             │
                     │  │  (Sequelize) │  │   Registry   │             │
                     │  └──────────────┘  └──────┬───────┘             │
                     │                           │                     │
                     │               ┌───────────┼───────────┐         │
                     │               ▼           ▼           ▼         │
                     │        ┌──────────┐ ┌──────────┐ ┌──────────┐  │
                     │        │  PayPal  │ │  Stripe  │ │  Future  │  │
                     │        │ Provider │ │ Provider │ │ Provider │  │
                     │        └─────┬────┘ └─────┬────┘ └──────────┘  │
                     │              │             │                     │
                     │              ▼             ▼                     │
                     │           External Payment APIs                 │
                     │                                                  │
 Cliente Backend ◄───┤  POST (Webhook Notification) + Firma HMAC       │
 (Notificaciones)    │                                                  │
                     │  ┌──────────────┐  ┌────────────────────────┐  │
                     │  │  BullMQ      │  │     Redis              │  │
                     │  │  Worker      │  │  (Queue + Cache)       │  │
                     │  └──────────────┘  └────────────────────────┘  │
                     └──────────────────────────────────────────────────┘
```

### Capas

- **Routes** -- Enrutadores Express que definen endpoints, cadenas de middleware y delegacion a controladores.
- **Middlewares** -- Autenticacion (`verifyApiKey`), validacion de esquemas Zod (`validateSchema`), verificacion de firmas webhook (`verifySignature`) y manejador global de errores.
- **Controllers** -- Capa HTTP delgada que delega a servicios.
- **Services** -- Logica de negocio principal: ciclo de vida de transacciones, procesamiento de webhooks y cola de notificaciones.
- **Providers** -- Patron estrategia conectable, implementado mediante una clase base abstracta `PaymentProvider`. El `ProviderRegistry` registra automaticamente los proveedores disponibles segun las variables de entorno.
- **Workers** -- Worker BullMQ que procesa la cola `payment-notifications`: consulta la transaccion, construye el payload, lo firma con HMAC-SHA256 y lo envia al webhook del cliente con reintentos exponenciales (5 intentos).

---

## Flujo de Pago

1. El backend cliente envia una solicitud `POST /api/v1/payments/create` con el monto, moneda y proveedor deseado.
2. El gateway crea una transaccion en estado `RECEIVED` y delega la creacion al proveedor correspondiente.
3. El proveedor devuelve una URL de redireccion (checkout de PayPal, Checkout Session de Stripe).
4. El gateway responde con la URL de redireccion y actualiza la transaccion a `PROCESSING`.
5. El usuario final completa el pago en la pagina del proveedor.
6. El proveedor envia un evento webhook al gateway (`POST /api/v1/webhooks/:provider`).
7. El gateway verifica la firma del webhook, consulta el estado real de la transaccion con el proveedor y actualiza el registro en base de datos.
8. El gateway encola una notificacion en BullMQ.
9. El worker envía la notificacion al webhook del cliente (`POST` HTTP con firma HMAC-SHA256 en el header `X-Signature`).
10. El backend cliente verifica la firma y procesa la actualizacion de estado.

---

## Requisitos

- Node.js 20 o superior
- Docker y Docker Compose (para el entorno de desarrollo completo)
- PostgreSQL 15+
- Redis 7+
- Cuenta de desarrollador en PayPal y/o Stripe (sandbox)

---

## Inicio Rapido

### Con Docker (recomendado)

```bash
git clone https://github.com/Enma586/payment.git
cd payment-gateway
cp .env.example .env
# Editar .env con al menos las credenciales de un proveedor
docker compose up -d --build
curl http://localhost:3000/health
```

### Sin Docker

```bash
npm install
cp .env.example .env
# Configurar las variables de base de datos PostgreSQL y Redis
npm run migrate
npm run dev
```

---

## API

### Endpoints Publicos

| Metodo | Ruta | Autenticacion | Descripcion |
|--------|------|---------------|-------------|
| `GET` | `/health` | Ninguna | Verifica conectividad con base de datos y Redis |

### Endpoints de Pago

| Metodo | Ruta | Autenticacion | Descripcion |
|--------|------|---------------|-------------|
| `POST` | `/api/v1/payments/create` | `x-api-key` | Crea una intencion de pago |
| `GET` | `/api/v1/payments/:id/status` | `x-api-key` | Consulta el estado de una transaccion |
| `POST` | `/api/v1/payments/:id/refund` | `x-api-key` | Reembolsa total o parcialmente una transaccion |
| `GET` | `/api/v1/payments/callback` | Ninguna | Callback de redireccion de PayPal |

### Endpoints de Consulta

| Metodo | Ruta | Autenticacion | Descripcion |
|--------|------|---------------|-------------|
| `GET` | `/api/v1/methods` | Ninguna | Lista los metodos de pago disponibles |

### Endpoints Webhook

| Metodo | Ruta | Autenticacion | Descripcion |
|--------|------|---------------|-------------|
| `POST` | `/api/v1/payments/webhook` | Firma HMAC | Webhook heredado |
| `POST` | `/api/v1/webhooks/:provider` | Firma del proveedor | Webhook por proveedor (PayPal, Stripe) |

### Estados de Transaccion

- `RECEIVED` -- Transaccion creada, pendiente de redireccion al proveedor.
- `PROCESSING` -- Usuario redirigido al proveedor, pago en curso.
- `COMPLETED` -- Pago capturado exitosamente.
- `FAILED` -- Pago rechazado o fallido.
- `RETRYING` -- Error temporal, reintento en curso.
- `REFUNDED` -- Transaccion reembolsada total o parcialmente.

---

## Proveedores Soportados

| Proveedor | Version API | Autenticacion | Verificacion Webhook |
|-----------|-------------|---------------|----------------------|
| PayPal    | Orders v2   | OAuth2 (Client Credentials) | API de verificacion de PayPal |
| Stripe    | Checkout Sessions | Secret Key | HMAC-SHA256 con tolerancia de tiempo |

Para agregar un nuevo proveedor, implemente la clase abstracta `PaymentProvider` y registrela en el `ProviderRegistry`. El registro se realiza automaticamente si las variables de entorno del proveedor estan presentes.

---

## Variables de Entorno

### Generales

| Variable | Requerida | Valor por Defecto | Descripcion |
|----------|-----------|-------------------|-------------|
| `PORT` | No | `3000` | Puerto del servidor |
| `BASE_URL` | No | `http://localhost:3000` | URL publica para redirecciones |
| `NODE_ENV` | No | `development` | Entorno de ejecucion |
| `SERVICE_API_KEY` | **Si** | -- | Clave API para autenticacion de clientes |
| `WEBHOOK_SECRET` | **Si** | -- | Secreto HMAC para firmar notificaciones salientes |
| `ALLOWED_ORIGINS` | No | -- | Origenes CORS permitidos (separados por comas) |
| `LOG_LEVEL` | No | `info` | Nivel de log de Pino |

### Base de Datos

| Variable | Requerida | Valor por Defecto | Descripcion |
|----------|-----------|-------------------|-------------|
| `DATABASE_URL` | No* | -- | Cadena de conexion completa a PostgreSQL |
| `DB_USER` | **Si** | -- | Usuario de PostgreSQL |
| `DB_PASSWORD` | **Si** | -- | Contrasena de PostgreSQL |
| `DB_NAME` | **Si** | -- | Nombre de la base de datos |
| `DB_HOST` | **Si** | `postgres_db` | Host de PostgreSQL |

### Redis

| Variable | Requerida | Valor por Defecto | Descripcion |
|----------|-----------|-------------------|-------------|
| `REDIS_HOST` | No | `localhost` | Host de Redis |
| `REDIS_PORT` | No | `6379` | Puerto de Redis |
| `REDIS_PASSWORD` | No | -- | Contrasena de Redis |

### Proveedores

Al menos un proveedor debe estar configurado para que el gateway registre metodos de pago.

**PayPal:**
| Variable | Requerida | Valor por Defecto | Descripcion |
|----------|-----------|-------------------|-------------|
| `PAYPAL_CLIENT_ID` | No* | -- | Client ID de la API REST de PayPal |
| `PAYPAL_CLIENT_SECRET` | No* | -- | Client Secret de la API REST de PayPal |
| `PAYPAL_WEBHOOK_ID` | No* | -- | ID del webhook de PayPal para verificacion |
| `PAYPAL_API_URL` | No | `https://api-m.sandbox.paypal.com` | URL base de la API de PayPal |
| `PAYPAL_SKIP_VERIFY` | No | `false` | Omitir verificacion de webhook (solo sandbox) |

**Stripe:**
| Variable | Requerida | Valor por Defecto | Descripcion |
|----------|-----------|-------------------|-------------|
| `STRIPE_SECRET_KEY` | No* | -- | Stripe Secret Key |
| `STRIPE_WEBHOOK_SECRET` | No* | -- | Secreto de firma del webhook de Stripe |

---

## Scripts Disponibles

| Comando | Descripcion |
|---------|-------------|
| `npm start` | Inicia el servidor en produccion |
| `npm run dev` | Inicia el servidor en modo desarrollo con recarga automatica |
| `npm test` | Ejecuta la suite de pruebas |
| `npm run test:watch` | Ejecuta pruebas en modo observador |
| `npm run test:coverage` | Ejecuta pruebas con reporte de cobertura |
| `npm run migrate` | Ejecuta las migraciones pendientes de Sequelize |

---

## Pruebas

El proyecto utiliza Vitest como framework de pruebas. La suite incluye pruebas unitarias para:

- Proveedores (PayPal, Stripe)
- Servicios (ciclo de vida de transacciones)
- Middlewares (autenticacion, verificacion de firmas)
- Esquemas de validacion (creacion de pagos, reembolsos)

```bash
npm test
npm run test:coverage
```

---

## Despliegue

### Produccion con Docker

```bash
docker compose -f docker-compose.prod.yaml up -d --build
```

El archivo `docker-compose.prod.yaml` expone solo los servicios esenciales: la aplicacion, PostgreSQL y Redis. La aplicacion se ejecuta detras de Nginx como balanceador de carga, con 3 replicas por defecto.

### Variables de Produccion

El archivo `.env.production` contiene una plantilla con configuraciones orientadas a produccion, incluyendo:

- `NODE_ENV=production`
- Niveles de log reducidos
- Password de Redis requerido
- Configuracion de CORS

---

## Estructura del Proyecto

```
payment-gateway/
├── config/
│   └── config.js                  # Configuracion de Sequelize CLI
├── migrations/                    # Migraciones de base de datos
├── models/                        # Modelos de Sequelize
├── src/
│   ├── app.js                     # Configuracion de Express
│   ├── config/                    # Conexiones a base de datos y Redis
│   ├── controllers/               # Controladores HTTP
│   ├── lib/                       # Utilidades (logger)
│   ├── middlewares/               # Middlewares de Express
│   ├── models/                    # Modelos de dominio
│   ├── providers/                 # Implementaciones de proveedores
│   │   ├── paypal/
│   │   └── stripe/
│   ├── routes/                    # Definicion de rutas
│   ├── schemas/                   # Esquemas de validacion Zod
│   ├── services/                  # Logica de negocio
│   └── workers/                   # Workers de BullMQ
├── tests/                         # Pruebas unitarias
├── docker-compose.yaml            # Entorno de desarrollo
├── docker-compose.prod.yaml       # Entorno de produccion
├── Dockerfile                     # Imagen Docker multi-etapa
├── docker-entrypoint.sh           # Script de entrada para contenedores
├── nginx.conf                     # Configuracion de Nginx
├── .env.example                   # Plantilla de variables de entorno
└── .env.production                # Plantilla para produccion
```

---

## Licencia

MIT
