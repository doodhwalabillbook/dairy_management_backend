'use strict';

const subscriptionStateService = require('../services/subscription-state.service');
const subscriptionService = require('../services/subscription.service');
const prisma = require('../../../config/prisma');

// Mock Prisma client for unit testing
jest.mock('../../../config/prisma', () => ({
  vendorSubscription: {
    findFirst: jest.fn()
  },
  customer: {
    count: jest.fn()
  },
  systemSetting: {
    findUnique: jest.fn()
  },
  $transaction: jest.fn()
}));

describe('Subscription Module Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Subscription State Calculation', () => {
    test('should calculate ACTIVE status when current date is well before expiry', async () => {
      // Mock system settings
      prisma.systemSetting.findUnique
        .mockResolvedValueOnce({ settingValue: '7' }) // grace period
        .mockResolvedValueOnce({ settingValue: '5' }); // warning days

      // Mock subscription expiring in 15 days
      const mockExpiry = new Date();
      mockExpiry.setDate(mockExpiry.getDate() + 15);

      prisma.vendorSubscription.findFirst.mockResolvedValue({
        planId: 'plan-basic-uuid',
        startDate: new Date(),
        expiryDate: mockExpiry,
        plan: {
          planName: 'BASIC',
          price: 49.00,
          customerLimit: 50
        }
      });

      prisma.customer.count.mockResolvedValue(35); // 35 of 50 customers used

      const result = await subscriptionStateService.getSubscriptionState('vendor-uuid');

      expect(result.subscriptionState).toBe('ACTIVE');
      expect(result.canAddCustomer).toBe(true);
      expect(result.canEditCustomer).toBe(true);
      expect(result.customerRemaining).toBe(15);
      expect(result.displayMessage).toBe('Your subscription is active.');
    });

    test('should calculate EXPIRING_SOON status when current date is within warning window', async () => {
      prisma.systemSetting.findUnique
        .mockResolvedValueOnce({ settingValue: '7' })
        .mockResolvedValueOnce({ settingValue: '5' });

      // Mock subscription expiring in 3 days
      const mockExpiry = new Date();
      mockExpiry.setDate(mockExpiry.getDate() + 3);

      prisma.vendorSubscription.findFirst.mockResolvedValue({
        planId: 'plan-basic-uuid',
        startDate: new Date(),
        expiryDate: mockExpiry,
        plan: {
          planName: 'BASIC',
          price: 49.00,
          customerLimit: 50
        }
      });

      prisma.customer.count.mockResolvedValue(35);

      const result = await subscriptionStateService.getSubscriptionState('vendor-uuid');

      expect(result.subscriptionState).toBe('EXPIRING_SOON');
      expect(result.canAddCustomer).toBe(true);
      expect(result.canEditCustomer).toBe(true);
      expect(result.warningRequired).toBe(true);
      expect(result.displayMessage).toContain('Your subscription will expire in');
    });

    test('should calculate GRACE_PERIOD status and allow customer addition/edit', async () => {
      prisma.systemSetting.findUnique
        .mockResolvedValueOnce({ settingValue: '7' })
        .mockResolvedValueOnce({ settingValue: '5' });

      // Mock subscription expired 2 days ago (within 7 days grace)
      const mockExpiry = new Date();
      mockExpiry.setDate(mockExpiry.getDate() - 2);

      prisma.vendorSubscription.findFirst.mockResolvedValue({
        planId: 'plan-basic-uuid',
        startDate: new Date(),
        expiryDate: mockExpiry,
        plan: {
          planName: 'BASIC',
          price: 49.00,
          customerLimit: 50
        }
      });

      prisma.customer.count.mockResolvedValue(35);

      const result = await subscriptionStateService.getSubscriptionState('vendor-uuid');

      expect(result.subscriptionState).toBe('GRACE_PERIOD');
      expect(result.canAddCustomer).toBe(true);
      expect(result.canEditCustomer).toBe(true);
      expect(result.displayMessage).toContain('grace days remaining');
    });

    test('should calculate EXPIRED status and block customer addition/edit when beyond grace period', async () => {
      prisma.systemSetting.findUnique
        .mockResolvedValueOnce({ settingValue: '7' })
        .mockResolvedValueOnce({ settingValue: '5' });

      // Mock subscription expired 10 days ago (past 7 days grace)
      const mockExpiry = new Date();
      mockExpiry.setDate(mockExpiry.getDate() - 10);

      prisma.vendorSubscription.findFirst.mockResolvedValue({
        planId: 'plan-basic-uuid',
        startDate: new Date(),
        expiryDate: mockExpiry,
        plan: {
          planName: 'BASIC',
          price: 49.00,
          customerLimit: 50
        }
      });

      prisma.customer.count.mockResolvedValue(35);

      const result = await subscriptionStateService.getSubscriptionState('vendor-uuid');

      expect(result.subscriptionState).toBe('EXPIRED');
      expect(result.canAddCustomer).toBe(false);
      expect(result.canEditCustomer).toBe(false);
      expect(result.displayMessage).toBe('Your subscription has expired. Please renew your subscription.');
    });

    test('should block customer addition if customerLimit is exceeded even if state is ACTIVE', async () => {
      prisma.systemSetting.findUnique
        .mockResolvedValueOnce({ settingValue: '7' })
        .mockResolvedValueOnce({ settingValue: '5' });

      const mockExpiry = new Date();
      mockExpiry.setDate(mockExpiry.getDate() + 15);

      prisma.vendorSubscription.findFirst.mockResolvedValue({
        planId: 'plan-basic-uuid',
        startDate: new Date(),
        expiryDate: mockExpiry,
        plan: {
          planName: 'BASIC',
          price: 49.00,
          customerLimit: 50
        }
      });

      prisma.customer.count.mockResolvedValue(50); // Limit reached

      const result = await subscriptionStateService.getSubscriptionState('vendor-uuid');

      expect(result.subscriptionState).toBe('ACTIVE');
      expect(result.canAddCustomer).toBe(false); // blocked
      expect(result.canEditCustomer).toBe(true); // still allowed
    });
  });
});
