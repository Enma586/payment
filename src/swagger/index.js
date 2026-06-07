import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Payment Gateway API',
      version: '1.0.0',
      description: 'API unificada para procesar pagos con múltiples proveedores (Stripe, PayPal).',
    },
    servers: [
      { url: process.env.BASE_URL || 'http://localhost:3000', description: 'Servidor activo' },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key para pruebas: demo-key-123',
        },
      },
      schemas: {
        CreatePaymentInput: {
          type: 'object',
          required: ['amount', 'currency', 'provider'],
          properties: {
            amount:        { type: 'integer', description: 'Monto en centavos (ej. 1000 = $10.00)', example: 1000 },
            currency:      { type: 'string', description: 'Código ISO 4217', example: 'USD' },
            provider:      { type: 'string', enum: ['paypal'], example: 'paypal' },
            paymentMethod: { type: 'string', example: 'card' },
            returnUrl:     { type: 'string', format: 'uri', example: 'https://micomercio.com/success' },
            cancelUrl:     { type: 'string', format: 'uri', example: 'https://micomercio.com/cancel' },
            webhookUrl:    { type: 'string', format: 'uri', description: 'URL para notificaciones POST de cambios de estado', example: 'https://micomercio.com/webhooks/pagos' },
            idempotencyKey:{ type: 'string', maxLength: 128, example: 'mi-idempotency-key-unica-001' },
            metadata:      { type: 'object', example: { orderId: 'ORD-12345', customerEmail: 'cliente@ejemplo.com' } },
          },
        },
        RefundInput: {
          type: 'object',
          properties: {
            amount: { type: 'integer', description: 'Monto parcial en centavos (opcional, omite para reembolso total)' },
            reason: { type: 'string', maxLength: 500 },
          },
        },
        PaymentResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                transactionId:   { type: 'string', format: 'uuid', description: 'UUID interno de la transacción' },
                providerPaymentId: { type: 'string', description: 'ID del pago en el proveedor (PayPal Order ID)' },
                redirectUrl:    { type: 'string', format: 'uri', description: 'URL para redirigir al usuario al checkout' },
                status:         { type: 'string', enum: ['RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status:  { type: 'string', example: 'error' },
            code:    { type: 'string', example: 'NOT_FOUND' },
            message: { type: 'string' },
          },
        },
        StatusResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                id:             { type: 'string', format: 'uuid' },
                status:         { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
                amount:         { type: 'integer' },
                currency:       { type: 'string' },
                provider:       { type: 'string' },
                providerPaymentId: { type: 'string' },
                metadata:       { type: 'object' },
                createdAt:      { type: 'string', format: 'date-time' },
                updatedAt:      { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        RefundResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                id:             { type: 'string', format: 'uuid' },
                status:         { type: 'string', example: 'REFUNDED' },
                amountRefunded: { type: 'integer' },
                refundId:       { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/swagger/paths/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);