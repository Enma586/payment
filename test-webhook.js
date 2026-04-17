import axios from 'axios';
import crypto from 'crypto';

const SECRET = 'tu_secreto_super_seguro_de_stripe'; // Debe ser la misma que en tu .env
const PAYLOAD = {
  externalId: "evt_test_123",
  amount: 5000, // $50.00
  currency: "USD",
  idempotencyKey: crypto.randomUUID(),
  rawResponse: { provider: "stripe", mode: "test" }
};

// Generar la firma HMAC que espera nuestro middleware
const signature = crypto
  .createHmac('sha256', SECRET)
  .update(JSON.stringify(PAYLOAD))
  .digest('hex');

async function sendTest() {
  try {
    const response = await axios.post('http://localhost:3000/api/v1/payments/webhook', PAYLOAD, {
      headers: { 'x-payment-signature': signature }
    });
    console.log('Server Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

sendTest();