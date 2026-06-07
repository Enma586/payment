import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Payment Gateway API',
      version: '1.0.0',
      description: 'Unified payment gateway API that abstracts multiple providers (PayPal) behind a consistent REST interface. Create payments, check status, process refunds, and receive async webhook notifications.',
    },
    servers: [
      { url: process.env.BASE_URL || 'http://localhost:3000', description: 'Active server' },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Test API key: demo-key-123',
        },
      },
      schemas: {
        CreatePaymentInput: {
          type: 'object',
          required: ['amount', 'currency', 'provider'],
          properties: {
            amount:        { type: 'integer', description: 'Amount in cents (e.g. 1000 = $10.00)', example: 1000 },
            currency:      { type: 'string', description: 'ISO 4217 currency code', example: 'USD' },
            provider:      { type: 'string', enum: ['paypal'], example: 'paypal' },
            paymentMethod: { type: 'string', example: 'paypal' },
            returnUrl:     { type: 'string', format: 'uri', example: 'https://mymerchant.com/success' },
            cancelUrl:     { type: 'string', format: 'uri', example: 'https://mymerchant.com/cancel' },
            webhookUrl:    { type: 'string', format: 'uri', description: 'URL to receive POST notifications on status changes', example: 'https://mymerchant.com/webhooks/payments' },
            idempotencyKey:{ type: 'string', maxLength: 128, example: 'my-unique-idempotency-key-001' },
            metadata:      { type: 'object', example: { orderId: 'ORD-12345', customerEmail: 'customer@example.com' } },
          },
        },
        RefundInput: {
          type: 'object',
          properties: {
            amount: { type: 'integer', description: 'Partial amount in cents (optional, omit for full refund)' },
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
                transactionId:   { type: 'string', format: 'uuid', description: 'Internal transaction UUID' },
                providerPaymentId: { type: 'string', description: 'Payment ID in the provider (PayPal Order ID)' },
                redirectUrl:    { type: 'string', format: 'uri', description: 'URL to redirect the user to checkout' },
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
                status:         { type: 'string', enum: ['RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
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
                transactionId:   { type: 'string', format: 'uuid' },
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
