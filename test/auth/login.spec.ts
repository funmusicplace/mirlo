import sinon from "sinon";
import assert from "assert";
import { clearTables, createUser } from "../utils";
import request from "supertest";

const baseURL = `${process.env.API_DOMAIN}/auth/`;
export const authRequestApp = request(baseURL);

describe("auth/login", () => {
  beforeEach(async () => {
    try {
      await clearTables();
    } catch (e) {
      console.error(e);
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("endpoint", () => {
    it("should not log in without email or password", async () => {
      const response = await authRequestApp
        .post(`login`)
        .set("Accept", "application/json");

      assert.equal(response.status, 401);
      assert.equal(response.body.error, "Missing log in information");
    });

    it("should not log in when no user found", async () => {
      const response = await authRequestApp
        .post(`login`)
        .send({
          email: "test",
          password: "test",
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 401);
      assert.equal(response.body.error, "Incorrect username or password");
    });

    it("should not log in when wrong password", async () => {
      const { user } = await createUser({
        email: "test@test.com",
      });
      const response = await authRequestApp
        .post(`login`)
        .send({
          email: user.email,
          password: "test",
        })
        .set("Accept", "application/json");

      assert.equal(response.status, 401);
      assert.equal(response.body.error, "Incorrect username or password");
    });
  });
});
