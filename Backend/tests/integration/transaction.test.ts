import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { Account, Transaction } from '../../src/models';

const app = createApp();

describe('Transaction APIs Integration Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let userAAcc1Id: string;
  let userAAcc2Id: string;
  let userBAccId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env['MONGODB_URI'] as string);
    }

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'User A',
      email: `user-a-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userAToken = resA.body.data.tokens.accessToken;
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'User B',
      email: `user-b-${Date.now()}@test.com`,
      password: 'Password123!',
    });
    userBToken = resB.body.data.tokens.accessToken;
    userBId = resB.body.data.user.id;

    // Create accounts for User A
    const acc1 = await Account.create({
      userId: new mongoose.Types.ObjectId(userAId),
      name: 'Main Checking',
      type: 'bank',
      openingBalance: 1000000, // 10,000 INR
    });
    userAAcc1Id = acc1._id.toString();

    const acc2 = await Account.create({
      userId: new mongoose.Types.ObjectId(userAId),
      name: 'Secondary Savings',
      type: 'savings',
      openingBalance: 500000, // 5,000 INR
    });
    userAAcc2Id = acc2._id.toString();

    // Create account for User B
    const accB = await Account.create({
      userId: new mongoose.Types.ObjectId(userBId),
      name: 'User B Account',
      type: 'bank',
      openingBalance: 200000,
    });
    userBAccId = accB._id.toString();
  });

  afterAll(async () => {
    await Account.deleteMany({
      userId: { $in: [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)] },
    });
    await Transaction.deleteMany({
      userId: { $in: [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)] },
    });
    await mongoose.connection.db?.collection('users').deleteMany({
      _id: { $in: [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)] },
    });
    await mongoose.connection.db?.collection('sessions').deleteMany({
      userId: { $in: [new mongoose.Types.ObjectId(userAId), new mongoose.Types.ObjectId(userBId)] },
    });
    await mongoose.disconnect();
  });

  let createdIncomeTxId: string;
  let createdExpenseTxId: string;

  // ── Authentication Check ─────────────────────────────────────────────────────

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/transactions');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ── Create Transactions ──────────────────────────────────────────────────────

  describe('POST /api/v1/transactions', () => {
    it('creates an income transaction and updates account balance', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'income',
          amount: 500000, // 5,000 INR
          category: 'freelance',
          description: 'Client payment',
          accountId: userAAcc1Id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.amount).toBe(500000);
      expect(res.body.data.transaction.category).toBe('freelance');
      createdIncomeTxId = res.body.data.transaction._id;

      // Verify balance increased by 5,000 INR (10,000 + 5,000 = 15,000 INR = 1500000 paise)
      const acc = await Account.findById(userAAcc1Id);
      expect(acc?.currentBalance).toBe(1500000);
    });

    it('creates an expense transaction and decrements account balance', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'expense',
          amount: 200000, // 2,000 INR
          category: 'groceries',
          description: 'Supermarket shopping',
          accountId: userAAcc1Id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdExpenseTxId = res.body.data.transaction._id;

      // Balance: 15,000 - 2,000 = 13,000 INR = 1300000 paise
      const acc = await Account.findById(userAAcc1Id);
      expect(acc?.currentBalance).toBe(1300000);
    });

    it('handles transfer between accounts and updates both balances', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'transfer',
          amount: 300000, // 3,000 INR
          category: 'transfer',
          description: 'Monthly savings allocation',
          accountId: userAAcc1Id,
          toAccountId: userAAcc2Id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Source Acc: 13,000 - 3,000 = 10,000 INR = 1000000 paise
      const sourceAcc = await Account.findById(userAAcc1Id);
      expect(sourceAcc?.currentBalance).toBe(1000000);

      // Dest Acc: 5,000 + 3,000 = 8,000 INR = 800000 paise
      const destAcc = await Account.findById(userAAcc2Id);
      expect(destAcc?.currentBalance).toBe(800000);
    });

    it('rejects transfer with same source and destination account', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'transfer',
          amount: 100000,
          category: 'transfer',
          description: 'Self-transfer attempt',
          accountId: userAAcc1Id,
          toAccountId: userAAcc1Id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects attempt to use another user account (cross-user isolation)', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'expense',
          amount: 50000,
          category: 'food',
          description: 'Sneaky expense on B account',
          accountId: userBAccId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('provides idempotency protection on duplicate request', async () => {
      const idempotencyKey = `tx-key-${Date.now()}`;
      const payload = {
        type: 'expense',
        amount: 100000,
        category: 'utilities',
        description: 'Internet bill',
        accountId: userAAcc1Id,
        idempotencyKey,
      };

      // First request
      const res1 = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(payload);
      expect(res1.status).toBe(201);
      const originalId = res1.body.data.transaction._id;

      // Second duplicate request
      const res2 = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(payload);
      expect(res2.status).toBe(200);
      expect(res2.body.data.transaction._id).toBe(originalId);
      expect(res2.body.meta.duplicate).toBe(true);

      // Verify account was only debited once!
      // Balance was 1,000,000; after 100,000 debit it should be 900,000 (not 800,000)
      const acc = await Account.findById(userAAcc1Id);
      expect(acc?.currentBalance).toBe(900000);
    });
  });

  // ── List & Filter Transactions ───────────────────────────────────────────────

  describe('GET /api/v1/transactions', () => {
    it('lists transactions with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?page=1&limit=2')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transactions).toHaveLength(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(4);
    });

    it('filters by category', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?category=groceries')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBeGreaterThanOrEqual(1);
      for (const tx of res.body.data.transactions) {
        expect(tx.category).toBe('groceries');
      }
    });

    it('filters by type', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?type=income')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      for (const tx of res.body.data.transactions) {
        expect(tx.type).toBe('income');
      }
    });

    it('does not leak User A transactions to User B', async () => {
      const res = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.transactions).toHaveLength(0);
    });
  });

  // ── Get Single Transaction ──────────────────────────────────────────────────

  describe('GET /api/v1/transactions/:id', () => {
    it('retrieves an existing transaction by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${createdIncomeTxId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.transaction._id).toBe(createdIncomeTxId);
    });

    it('returns 404 if User B attempts to access User A transaction', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${createdIncomeTxId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Update Transaction ───────────────────────────────────────────────────────

  describe('PUT /api/v1/transactions/:id', () => {
    it('updates description and adjusts balance when amount is changed', async () => {
      // createdExpenseTx was 200,000 paise (2,000 INR).
      // We change it to 250,000 paise (2,500 INR) -> extra 500 INR debit.
      const res = await request(app)
        .put(`/api/v1/transactions/${createdExpenseTxId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          description: 'Updated Grocery shopping',
          amount: 250000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.transaction.description).toBe('Updated Grocery shopping');
      expect(res.body.data.transaction.amount).toBe(250000);

      // Verify account balance was adjusted: 900,000 - 50,000 = 850,000 paise
      const acc = await Account.findById(userAAcc1Id);
      expect(acc?.currentBalance).toBe(850000);
    });

    it('returns 404 when User B attempts to update User A transaction', async () => {
      const res = await request(app)
        .put(`/api/v1/transactions/${createdExpenseTxId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          description: 'Malicious update',
        });

      expect(res.status).toBe(404);
    });
  });

  // ── Delete Transaction ───────────────────────────────────────────────────────

  describe('DELETE /api/v1/transactions/:id', () => {
    it('soft deletes transaction and reverses its balance impact', async () => {
      // createdExpenseTx is currently 250,000 paise debit on userAAcc1Id.
      // Current balance: 850,000.
      // Reversing it should restore balance to 850,000 + 250,000 = 1,100,000 paise!
      const res = await request(app)
        .delete(`/api/v1/transactions/${createdExpenseTxId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify balance restored
      const acc = await Account.findById(userAAcc1Id);
      expect(acc?.currentBalance).toBe(1100000);

      // Verify transaction is no longer returned in list
      const listRes = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${userAToken}`);
      const ids = listRes.body.data.transactions.map((t: { _id: string }) => t._id);
      expect(ids).not.toContain(createdExpenseTxId);

      // Verify direct GET returns 404
      const getRes = await request(app)
        .get(`/api/v1/transactions/${createdExpenseTxId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 404 when User B attempts to delete User A transaction', async () => {
      const res = await request(app)
        .delete(`/api/v1/transactions/${createdIncomeTxId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
    });
  });
});
