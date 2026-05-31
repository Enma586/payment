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
      { url: 'http://localhost:3000', description: 'Local dev' },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key para autenticación entre servicios',
        },
      },
      schemas: {
        CreatePaymentInput: {
          type: 'object',
          required: ['amount', 'currency', 'provider'],
          properties: {
            amount:        { type: 'integer', description: 'Monto en centavos (ej. 1000 = $10.00)', example: 1000 },
            currency:      { type: 'string', description: 'Código ISO 4217', example: 'USD' },
            provider:      { type: 'string', enum: ['stripe', 'paypal'], example: 'stripe' },
            paymentMethod: { type: 'string', example: 'card' },
            returnUrl:     { type: 'string', format: 'uri' },
            cancelUrl:     { type: 'string', format: 'uri' },
            idempotencyKey:{ type: 'string', maxLength: 128 },
            metadata:      { type: 'object' },
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
                id:             { type: 'string', format: 'uuid' },
                providerPaymentId: { type: 'string' },
                redirectUrl:    { type: 'string', format: 'uri' },
                status:         { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
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
      },
    },
  },
  apis: ['./src/swagger/paths/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);