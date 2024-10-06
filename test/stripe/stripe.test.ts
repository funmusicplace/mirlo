import sinon from 'sinon';
import { expect } from 'chai';
import {
  createTrackGroupStripeProduct,
  createStripeCheckoutSessionForPurchase,
  verifyStripeSignature,
} from '../../stripe';
import prisma from '@mirlo/prisma';
import Stripe from 'stripe';

const mockStripe = new Stripe('', { apiVersion: '2022-11-15' });

describe('Stripe tests', () => {
  before(() => {
    sinon.stub(prisma.trackGroup, 'update');
    sinon.stub(mockStripe.products, 'create');
    sinon.stub(mockStripe.checkout.sessions, 'create');
    sinon.stub(mockStripe.webhooks, 'constructEvent');
  });

  after(() => {
    sinon.restore();
  });

  it('createTrackGroupStripeProduct should create a Stripe product if one does not exist', async () => {
    (prisma.trackGroup.update as sinon.SinonStub).resolves({});
    (mockStripe.products.create as sinon.SinonStub).resolves({ id: 'product_123' });

    const trackGroup = {
      id: 1,
      title: 'Test Album',
      artist: { name: 'Artist' },
      stripeProductKey: null,
    };

    const result = await createTrackGroupStripeProduct(trackGroup, 'acct_123');

    sinon.assert.calledOnce(mockStripe.products.create as sinon.SinonStub);
    sinon.assert.calledWith(prisma.trackGroup.update as sinon.SinonStub, sinon.match.object);
    expect(result).to.equal('product_123');
  });

  it('createStripeCheckoutSessionForPurchase should create a checkout session', async () => {
    (prisma.client.findFirst as sinon.SinonStub).resolves({});
    (mockStripe.checkout.sessions.create as sinon.SinonStub).resolves({ id: 'session_123' });

    const result = await createStripeCheckoutSessionForPurchase({
      email: 'test@example.com',
      priceNumber: 1000,
      trackGroup: { id: 1, platformPercent: 5, currency: 'USD' },
      productKey: 'prod_123',
      stripeAccountId: 'acct_123',
    });

    sinon.assert.calledOnce(mockStripe.checkout.sessions.create as sinon.SinonStub);
    expect(result.id).to.equal('session_123');
  });

  it('verifyStripeSignature should verify event using Stripe signature', async () => {
    const mockReq = { headers: { 'stripe-signature': 'sig_123' }, rawBody: 'raw-body' };
    (mockStripe.webhooks.constructEvent as sinon.SinonStub).returns({ id: 'evt_123' });

    const result = await verifyStripeSignature(mockReq, {}, 'secret');
    sinon.assert.calledWith(mockStripe.webhooks.constructEvent as sinon.SinonStub, 'raw-body', 'sig_123', 'secret');
    expect(result.id).to.equal('evt_123');
  });
});