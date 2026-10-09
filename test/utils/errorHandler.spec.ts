import assert from "node:assert";

import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from "@prisma/client/runtime/client";
import { describe, it } from "mocha";

import errorHandler, { AppError } from "../../src/utils/error";

const mockReq = (overrides: Record<string, unknown> = {}) =>
  ({
    method: "POST",
    path: "/purchase",
    params: {},
    accepts: () => "json",
    ...overrides,
  }) as any;

const mockRes = () => {
  const res: any = { statusCode: 200 };
  res.status = (code: number) => {
    res._status = code;
    return res;
  };
  res.json = (body: any) => {
    res._json = body;
    return res;
  };
  res.headers = {} as Record<string, string>;
  res.setHeader = (name: string, value: string) => {
    res.headers[name] = value;
  };
  res.type = (type: string) => {
    res._type = type;
    return res;
  };
  res.send = (body: string) => {
    res._body = body;
    return res;
  };
  return res;
};

const noop = (() => {}) as any;

describe("errorHandler", () => {
  it("surfaces a Stripe error's message and status code", () => {
    const err = Object.assign(
      new Error("Reader is not capable of processing this action."),
      {
        type: "StripeInvalidRequestError",
        rawType: "invalid_request_error",
        code: "terminal_reader_hardware_fault",
        statusCode: 402,
        requestId: "req_test",
      }
    );
    const res = mockRes();

    errorHandler(err, mockReq(), res, noop);

    assert.equal(res._status, 402);
    assert.equal(
      res._json.error,
      "Reader is not capable of processing this action."
    );
    assert.equal(res._json.code, "terminal_reader_hardware_fault");
  });

  it("defaults a Stripe error without a statusCode to 400", () => {
    const err = Object.assign(new Error("Your card was declined."), {
      type: "StripeCardError",
      rawType: "card_error",
      code: "card_declined",
    });
    const res = mockRes();

    errorHandler(err, mockReq(), res, noop);

    assert.equal(res._status, 400);
    assert.equal(res._json.error, "Your card was declined.");
  });

  it("still surfaces AppErrors with their httpCode", () => {
    const res = mockRes();

    errorHandler(
      new AppError({ httpCode: 404, description: "Not found" }),
      mockReq(),
      res,
      noop
    );

    assert.equal(res._status, 404);
    assert.equal(res._json.error, "Not found");
  });

  describe("when the database is unavailable", () => {
    const initError = () =>
      new PrismaClientInitializationError(
        "Can't reach database server at `db.internal:5432`",
        "6.19.3",
        "P1001"
      );

    it("answers an API request with a 503 that doesn't leak connection details", () => {
      const res = mockRes();

      errorHandler(initError(), mockReq({ path: "/v1/artists" }), res, noop);

      assert.equal(res._status, 503);
      assert.equal(res.headers["Retry-After"], "60");
      assert.match(res._json.error, /temporarily unavailable/);
      assert.doesNotMatch(res._json.error, /db\.internal/);
    });

    it("treats a lost connection mid-query as unavailable, not a bad request", () => {
      const err = new PrismaClientKnownRequestError(
        "Server has closed the connection.",
        {
          code: "P1017",
          clientVersion: "6.19.3",
        }
      );
      const res = mockRes();

      errorHandler(err, mockReq({ path: "/v1/artists" }), res, noop);

      assert.equal(res._status, 503);
    });

    it("serves a maintenance page to a browser loading a page", () => {
      const res = mockRes();

      errorHandler(
        initError(),
        mockReq({ method: "GET", path: "/some-artist", accepts: () => "html" }),
        res,
        noop
      );

      assert.equal(res._status, 503);
      assert.equal(res._type, "html");
      assert.match(res._body, /temporarily unavailable/);
    });
  });
});
