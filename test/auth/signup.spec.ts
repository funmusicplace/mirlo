import assert from "assert";

import prisma from "@mirlo/prisma";
import { Request, Response } from "express";
import sinon from "sinon";

import { sendMailQueue } from "../../src/queues/send-mail-queue";
import signup from "../../src/routers/auth/signup";
import { clearTables, createUser } from "../utils";

describe("auth/signup", () => {
  let mockRes: Response;
  let statusStub: sinon.SinonStub;
  let jsonStub: sinon.SinonStub;
  const mockReq = {
    body: {
      email: "test@example.com",
      password: "password",
      name: "Test User",
    },
  } as unknown as Request;
  const mockNext = sinon.stub();

  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }

    statusStub = sinon.stub().returnsThis();
    jsonStub = sinon.stub();
    mockRes = {
      status: statusStub,
      json: jsonStub,
    } as unknown as Response;
  });

  afterEach(() => {
    sinon.restore();
    mockNext.reset();
  });

  it("signup should create new user and send confirmation email", async () => {
    const stub = sinon.stub(sendMailQueue, "add").resolves();

    await prisma.client.create({
      data: {
        applicationUrl: "test",
        applicationName: "test",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    await signup(mockReq, mockRes, mockNext);

    const createdUser = prisma.user.findFirst({
      where: {
        email: mockReq.body.email,
      },
    });
    assert(createdUser);
    assert(stub.calledWithMatch("send-mail", { template: "new-user" }));
  });

  it("signup should error if no password supplied", async () => {
    sinon.stub(sendMailQueue, "add").resolves();

    await prisma.client.create({
      data: {
        applicationUrl: "test",
        applicationName: "test",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    const { user } = await createUser({ email: "test@test.com" });
    let error;
    try {
      await signup(
        { body: { email: user.email } } as unknown as Request,
        mockRes,
        mockNext
      );
      assert(mockNext.calledOnce);
      assert.equal(
        mockNext.firstCall.firstArg.message,
        "Email and password must be supplied"
      );
    } catch (e) {
      error = e;
    }
    assert(!error);
  });

  it("signup should error if user exists but incomplete", async () => {
    sinon.stub(sendMailQueue, "add").resolves();

    await prisma.client.create({
      data: {
        applicationUrl: "test",
        applicationName: "test",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    const { user } = await createUser({ email: "test@test.com" });
    let error;
    try {
      await signup(
        { body: { email: user.email, password: "hi" } } as unknown as Request,
        mockRes,
        mockNext
      );
      assert(mockNext.called);
      assert.equal(
        mockNext.firstCall.firstArg.message,
        "User account incomplete"
      );
    } catch (e) {
      error = e;
    }
    assert(!error);
  });

  it("signup should error if user exists and has password", async () => {
    sinon.stub(sendMailQueue, "add").resolves();

    await prisma.client.create({
      data: {
        applicationUrl: "test",
        applicationName: "test",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    const { user } = await createUser({
      email: "test@test.com",
      password: "tstt",
    });

    await signup(
      { body: { email: user.email, password: "hi" } } as unknown as Request,
      mockRes,
      mockNext
    );

    assert(mockNext.notCalled);
    assert(statusStub.calledWith(400));
    assert(
      jsonStub.calledWithMatch(
        sinon.match({
          error: "A user with this email already exists",
          requiresEmailVerification: true,
          emailConfirmationExpired: false,
          emailConfirmationExpiresAt: sinon.match(
            (value) => typeof value === "string"
          ),
        })
      )
    );
  });

  describe("with an invite", () => {
    const createInvite = async (accountType: "ARTIST" | "LABEL") => {
      const { user: admin } = await createUser({ email: "admin@test.com" });
      return prisma.invite.create({
        data: {
          email: "invited@example.com",
          invitedById: admin.id,
          accountType,
        },
      });
    };

    const signupWithInvite = (invite: { email: string; token: string }) =>
      signup(
        {
          body: {
            email: invite.email,
            password: "password",
            name: "Invited",
            accountType: "listener",
            emailInvited: invite.email,
            inviteToken: invite.token,
          },
        } as unknown as Request,
        mockRes,
        mockNext
      );

    beforeEach(async () => {
      await prisma.client.create({
        data: { applicationUrl: "test", applicationName: "test" },
      });
    });

    it("creates an artist on a closed instance", async () => {
      const stub = sinon.stub(sendMailQueue, "add").resolves();
      await prisma.settings.create({
        data: {
          settings: { platformPercent: 10 },
          isClosedToPublicArtistSignup: true,
        },
      });
      const invite = await createInvite("ARTIST");

      await signupWithInvite(invite);

      const user = await prisma.user.findFirstOrThrow({
        where: { email: invite.email },
      });
      assert.equal(user.canCreateArtists, true);
      assert.equal(user.isLabelAccount, false);
      assert(
        stub.calledWithMatch("send-mail", {
          template: "new-user",
          locals: { accountType: "artist" },
        })
      );
      const usedInvite = await prisma.invite.findUniqueOrThrow({
        where: { id: invite.id },
      });
      assert.equal(usedInvite.usedById, user.id);
    });

    it("creates a label account from a label invite", async () => {
      sinon.stub(sendMailQueue, "add").resolves();
      await prisma.settings.create({
        data: {
          settings: { platformPercent: 10 },
          isClosedToPublicArtistSignup: true,
        },
      });
      const invite = await createInvite("LABEL");

      await signupWithInvite(invite);

      const user = await prisma.user.findFirstOrThrow({
        where: { email: invite.email },
      });
      assert.equal(user.canCreateArtists, true);
      assert.equal(user.isLabelAccount, true);
    });

    it("creates a listener on a closed instance when the invite doesn't match", async () => {
      sinon.stub(sendMailQueue, "add").resolves();
      await prisma.settings.create({
        data: {
          settings: { platformPercent: 10 },
          isClosedToPublicArtistSignup: true,
        },
      });
      const invite = await createInvite("ARTIST");

      await signupWithInvite({ email: invite.email, token: "wrong-token" });

      const user = await prisma.user.findFirstOrThrow({
        where: { email: invite.email },
      });
      assert.equal(user.canCreateArtists, false);
      const unusedInvite = await prisma.invite.findUniqueOrThrow({
        where: { id: invite.id },
      });
      assert.equal(unusedInvite.usedAt, null);
    });

    it("marks the invite used on an open instance", async () => {
      sinon.stub(sendMailQueue, "add").resolves();
      const invite = await createInvite("LABEL");

      await signupWithInvite(invite);

      const user = await prisma.user.findFirstOrThrow({
        where: { email: invite.email },
      });
      assert.equal(user.isLabelAccount, true);
      const usedInvite = await prisma.invite.findUniqueOrThrow({
        where: { id: invite.id },
      });
      assert.equal(usedInvite.usedById, user.id);
    });
  });

  it("signup should flag expired confirmation tokens", async () => {
    sinon.stub(sendMailQueue, "add").resolves();

    await prisma.client.create({
      data: {
        applicationUrl: "test",
        applicationName: "test",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    const { user } = await createUser({
      email: "expired@example.com",
      password: "tstt",
      emailConfirmationExpiration: new Date(Date.now() - 1000),
    });

    await signup(
      { body: { email: user.email, password: "hi" } } as unknown as Request,
      mockRes,
      mockNext
    );

    assert(mockNext.notCalled);
    assert(statusStub.calledWith(400));
    assert(
      jsonStub.calledWithMatch(
        sinon.match({
          error: "A user with this email already exists",
          requiresEmailVerification: true,
          emailConfirmationExpired: true,
          emailConfirmationExpiresAt: sinon.match(
            (value) => typeof value === "string"
          ),
        })
      )
    );
  });
});
