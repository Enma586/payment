import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Transaction model
const mockFindOne = vi.fn();
const mockFindByPk = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

const mockTransactionInstance = {
  id: 'tx-uuid-123',
  externalId: 'tx_12345_abc',
  amount: 1000,
  currency: 'USD',
  provider: 'paypal',
  providerPaymentId: 'PAYPAL-ORDER-123',
  status: 'COMPLETED',
  rawResponse: {
    purchase_units: [{
      payments: { captures: [{ id: 'CAPTURE-ID-123' }] }
    }]
  },
  update: mockUpdate,
};

vi.mock('../../../src/models/index.js', () => ({
  Transaction: {
    findOne: mockFindOne,
    findByPk: mockFindByPk,
    create: mockCreate,
  },
}));

// Mock provider registry
const mockRefundPayment = vi.fn();
vi.mock('../../../src/providers/registry.js', () => ({
  default: {
    getProvider: vi.fn(() => ({
      getProviderName: () => 'paypal',
      getSupportedMethods: () => ['card', 'paypal'],
      createPayment: vi.fn(() => ({
        providerPaymentId: 'ORDER-123',
        redirectUrl: 'https://paypal.approve/123',
        status: 'PENDING',
      })),
      refundPayment: mockRefundPayment,
    })),
    listAll: vi.fn(() => [
      { name: 'paypal', methods: ['card', 'paypal'] },
    ]),
  },
}));

// Mock queue service
vi.mock('../../../src/services/index.js', () => ({
  queueService: {
    addPaymentToQueue: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { createPayment, getPaymentStatus, refundPayment } = await import(
  '../../../src/services/transactionService.js'
);

describe('transactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createPayment ─────────────────────────────────────────────
  describe('createPayment', () => {
    it('creates a payment and returns transaction data', async () => {
      mockFindOne.mockResolvedValue(null); // no idempotency match
      mockCreate.mockResolvedValue({
        ...mockTransactionInstance,
        status: 'RECEIVED',
        update: mockUpdate,
      });
      mockUpdate.mockResolvedValue(true);

      const result = await createPayment({
        amount: 1000,
        currency: 'USD',
        provider: 'paypal',
        idempotencyKey: 'ik_test_123',
      });

      expect(mockCreate).toHaveBeenCalledOnce();
      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('redirectUrl');
    });

    it('returns existing transaction for duplicate idempotencyKey', async () => {
      mockFindOne.mockResolvedValue({
        ...mockTransactionInstance,
        rawResponse: { redirectUrl: 'https://paypal.approve/existing' },
      });

      const result = await createPayment({
        amount: 1000,
        currency: 'USD',
        provider: 'paypal',
        idempotencyKey: 'ik_duplicate',
      });

      expect(mockCreate).not.toHaveBeenCalled();
      expect(result.status).toBe('COMPLETED');
    });
  });

  // ── getPaymentStatus ──────────────────────────────────────────
  describe('getPaymentStatus', () => {
    it('returns transaction data when found', async () => {
      mockFindByPk.mockResolvedValue(mockTransactionInstance);

      const result = await getPaymentStatus('tx-uuid-123');

      expect(result).not.toBeNull();
      expect(result.id).toBe('tx-uuid-123');
      expect(result.amount).toBe(1000);
      expect(result.currency).toBe('USD');
    });

    it('returns null when not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      const result = await getPaymentStatus('non-existent-id');

      expect(result).toBeNull();
    });
  });

  // ── refundPayment ─────────────────────────────────────────────
  describe('refundPayment', () => {
    it('refunds a completed transaction', async () => {
      mockFindByPk.mockResolvedValue(mockTransactionInstance);
      mockRefundPayment.mockResolvedValue({
        refundId: 'REFUND-123',
        status: 'COMPLETED',
      });
      mockUpdate.mockResolvedValue(true);

      const result = await refundPayment('tx-uuid-123');

      expect(mockRefundPayment).toHaveBeenCalledWith('CAPTURE-ID-123', 1000);
      expect(result.refundId).toBe('REFUND-123');
      expect(result.amount).toBe(1000);
    });

    it('refunds with custom amount (partial refund)', async () => {
      mockFindByPk.mockResolvedValue(mockTransactionInstance);
      mockRefundPayment.mockResolvedValue({
        refundId: 'REFUND-456',
        status: 'COMPLETED',
      });
      mockUpdate.mockResolvedValue(true);

      const result = await refundPayment('tx-uuid-123', { amount: 500 });

      expect(mockRefundPayment).toHaveBeenCalledWith('CAPTURE-ID-123', 500);
      expect(result.amount).toBe(500);
    });

    it('throws when transaction not found', async () => {
      mockFindByPk.mockResolvedValue(null);

      await expect(refundPayment('non-existent'))
        .rejects.toThrow('Transaction not found');
    });

    it('throws when transaction is not COMPLETED', async () => {
      mockFindByPk.mockResolvedValue({
        ...mockTransactionInstance,
        status: 'PROCESSING',
      });

      await expect(refundPayment('tx-uuid-123'))
        .rejects.toThrow('Cannot refund');
    });
  });
});