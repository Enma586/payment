import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables before importing the module
vi.stubEnv('SERVICE_API_KEY', 'test-secret-key');

const { verifyApiKey } = await import(
  '../../../src/middlewares/verifyApiKey.js'
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

describe('verifyApiKey', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = createMockRes();
    next = vi.fn();
  });

  it('calls next() with valid API key', () => {
    req.headers['x-api-key'] = 'test-secret-key';
    verifyApiKey(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 when API key is missing', () => {
    verifyApiKey(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('API key is required');
  });

  it('returns 401 when API key is wrong', () => {
    req.headers['x-api-key'] = 'wrong-key';
    verifyApiKey(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid API key');
  });
});