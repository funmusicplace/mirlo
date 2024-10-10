// tests/settings.test.ts
import { getSiteSettings } from '../settings';
import prisma from '@mirlo/prisma';

jest.mock('@mirlo/prisma');

describe('Settings tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getSiteSettings should return default settings if none exist in DB', async () => {
    prisma.settings.findFirst.mockResolvedValue(null);

    const settings = await getSiteSettings();
    
    expect(settings).toEqual({ platformPercent: 7 });
  });

  test('getSiteSettings should merge DB settings with default settings', async () => {
    prisma.settings.findFirst.mockResolvedValue({
      settings: { platformPercent: 10 },
    });

    const settings = await getSiteSettings();

    expect(settings).toEqual({ platformPercent: 10 });
  });
});
