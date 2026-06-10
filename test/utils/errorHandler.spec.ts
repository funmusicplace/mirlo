import assert from "node:assert";

import { describe, it } from "mocha";

import errorHandler, { AppError } from "../../src/utils/error";

const mockReq = () =>
  ({ method: "POST", path: "/purchase", params: {} }) as any;

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
});
