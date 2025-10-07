import resendVerificationEmail from "../../src/routers/auth/resendVerificationEmail";
import prisma from "@mirlo/prisma";
import { Request, Response } from "express";
import * as sendMail from "../../src/jobs/send-mail";
import sinon from "sinon";
import assert from "assert";
import { clearTables, createUser } from "../utils";
import { randomUUID } from "crypto";

describe("auth/resendVerificationEmail", () => {
  let statusStub: sinon.SinonStub;
  let jsonStub: sinon.SinonStub;
  let mockRes: Response;
  let mockNext: sinon.SinonStub;

  beforeEach(async () => {
    await clearTables();
    statusStub = sinon.stub().returnsThis();
    jsonStub = sinon.stub();
    mockRes = {
      status: statusStub,
      json: jsonStub,
    } as unknown as Response;
    mockNext = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should resend verification email for unverified users", async () => {
    const sendMailStub = sinon.stub(sendMail, "sendMail").resolves();

    const client = await prisma.client.create({
      data: {
        applicationUrl: "test",
        applicationName: "test",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    const { user } = await createUser({
      email: "test@example.com",
      password: "password",
      emailConfirmationToken: randomUUID(),
      emailConfirmationExpiration: new Date(Date.now() - 1000),
    });

    const req = {
      body: {
        email: user.email,
        client: client.applicationUrl,
        accountType: "artist",
      },
    } as unknown as Request;

    await resendVerificationEmail(req, mockRes, mockNext);

    assert(mockNext.notCalled);
    assert(statusStub.calledWith(200));
    assert(
      jsonStub.calledWithMatch(
        sinon.match({
          message: "Success! Verification email sent.",
          emailConfirmationExpiresAt: sinon.match((value) =>
            typeof value === "string"
          ),
        })
      )
    );
    assert(sendMailStub.called);

    const updatedUser = await prisma.user.findFirst({
      where: { id: user.id },
    });

    assert(updatedUser);
    assert(updatedUser?.emailConfirmationToken);
    assert.notStrictEqual(
      updatedUser?.emailConfirmationToken,
      "initial-token"
    );
    assert(
      (updatedUser?.emailConfirmationExpiration?.getTime() ?? 0) > Date.now()
    );
  });

  it("should error when user does not require verification", async () => {
    sinon.stub(sendMail, "sendMail");

    await prisma.client.create({
      data: {
        applicationUrl: "test",
        applicationName: "test",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    });

    const { user } = await createUser({
      email: "verified@example.com",
      password: "password",
      emailConfirmationToken: null,
    });

    const req = {
      body: {
        email: user.email,
        client: "test",
      },
    } as unknown as Request;

    await resendVerificationEmail(req, mockRes, mockNext);

    assert(mockNext.called);
    assert.equal(
      mockNext.firstCall.firstArg.message,
      "User does not require email verification"
    );
  });

  it("should respond with error when client not found", async () => {
    sinon.stub(sendMail, "sendMail");

    const { user } = await createUser({
      email: "missing-client@example.com",
      password: "password",
      emailConfirmationToken: randomUUID(),
    });

    const req = {
      body: {
        email: user.email,
        client: "missing",
      },
    } as unknown as Request;

    await resendVerificationEmail(req, mockRes, mockNext);

    assert(mockNext.notCalled);
    assert(statusStub.calledWith(400));
    assert(
      jsonStub.calledWithMatch({ error: "This client does not exist " })
    );
  });
});
