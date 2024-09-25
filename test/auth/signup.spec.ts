import signup from "../../src/routers/auth/signup";
import prisma from "@mirlo/prisma";
import { Request, Response } from "express";
import * as sendMail from "../../src/jobs/send-mail";
import sinon from "sinon";
import assert from "assert";
import { clearTables } from "../utils";

describe("auth/signup", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });
  const mockReq = {
    body: {
      email: "test@example.com",
      password: "password",
      name: "Test User",
    },
  } as unknown as Request;
  const mockRes = {
    status: sinon.stub().returnsThis(),
    json: sinon.stub(),
  } as unknown as Response;
  const mockNext = sinon.stub();

  afterEach(() => {
    sinon.restore();
  });

  it("signup should create new user and send confirmation email", async () => {
    const stub = sinon.stub(sendMail, "sendMail");

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
    assert(stub.calledWithMatch({ data: { template: "new-user" } }));
  });
});
