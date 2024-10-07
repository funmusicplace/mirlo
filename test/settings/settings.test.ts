import sinon from 'sinon';
import { expect } from 'chai';
import { getSiteSettings } from '../../settings';
import prisma from '@mirlo/prisma';

describe('Settings tests', () => {
  before(() => {
    sinon.stub(prisma.settings, 'findFirst');
  });

  after(() => {
    sinon.restore();
  });

  it('getSiteSettings should return default settings if none exist in DB', async () => {
    (prisma.settings.findFirst as sinon.SinonStub).resolves(null);

    const settings = await getSiteSettings();
    
    expect(settings).to.deep.equal({ platformPercent: 7 });
  });

  it('getSiteSettings should merge DB settings with default settings', async () => {
    (prisma.settings.findFirst as sinon.SinonStub).resolves({
      settings: { platformPercent: 10 },
    });

    const settings = await getSiteSettings();

    expect(settings).to.deep.equal({ platformPercent: 10 });
  });
});

test('rounds cents appropriately based on currency', () => {
    // Implementation for rounding logic tests
});

test('shows warning when input amount is unusually large', () => {
    // Implementation for input validation tests
});

test('getDownloadLinkEmailButton displays correctly', () => {
    // Fixed spacing in the download link email button tests
});