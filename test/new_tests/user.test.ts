// tests/user.test.ts
import { deleteUser, findOrCreateUserBasedOnEmail } from '../user';
import prisma from '@mirlo/prisma';
import logger from '../logger';

jest.mock('@mirlo/prisma');
jest.mock('../logger');

describe('User tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('deleteUser should delete associated artists and user', async () => {
    prisma.artist.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const deleteArtistMock = jest.fn();
    const deleteStripeSubscriptionsMock = jest.fn();

    await deleteUser(1);

    expect(prisma.artist.findMany).toHaveBeenCalledWith({ where: { userId: 1 } });
    expect(deleteArtistMock).toHaveBeenCalledTimes(2);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  test('findOrCreateUserBasedOnEmail should create a new user if one does not exist', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 1, email: 'test@example.com' });
    const result = await findOrCreateUserBasedOnEmail('test@example.com');
    
    expect(logger.info).toHaveBeenCalledWith('Creating a new user for test@example.com');
    expect(prisma.user.create).toHaveBeenCalledWith({ data: { email: 'test@example.com' } });
    expect(result).toEqual({ userId: '1', newUser: true, user: { id: 1, email: 'test@example.com' } });
  });
});
