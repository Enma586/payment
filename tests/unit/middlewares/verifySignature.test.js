import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

const SECRET = 'test-webhook-secret';
vi.stubEnv('WEBHOOK_SECRET', SECRET);

const { verifySignature } = await import(
  '../../../src/middlewares/verifySignature.js'
);

const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
  };
  return res;
};

const generateSignature = (payload, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
};

describe('verifySignature', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {}, rawBody: '', body: {} };
    res = createMockRes();
    next = vi.fn();
  });

  it('calls next() with valid signature', () => {
    const payload = { transactionId: 'abc-123', status: 'COMPLETED' };
    const signature = generateSignature(payload, SECRET);

    req.rawBody = JSON.stringify(payload);
    req.headers['x-payment-signature'] = signature;

    verifySignature(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 401 when signature header is missing', () => {
    verifySignature(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('No signature provided');
  });

  it('returns 403 when signature is invalid', () => {
    req.rawBody = JSON.stringify({ foo: 'bar' });
    req.headers['x-payment-signature'] = 'invalid-signature';

    verifySignature(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Invalid signature');
  });

  it('returns 403 with wrong secret', () => {
    const payload = { test: 'data' };
    const wrongSignature = generateSignature(payload, 'wrong-secret');

    req.rawBody = JSON.stringify(payload);
    req.headers['x-payment-signature'] = wrongSignature;

    verifySignature(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});