import * as dotenv from "dotenv";
dotenv.config();
import request from "supertest";

import { clearTables, createUser } from "./utils";

/**
 * Hooks that run once around the whole Mocha run (registered in .mocharc.js).
 */
export const mochaHooks = {
  /**
   * The API process keeps its bucket prefix in memory, set at boot from the
   * Settings row and changed whenever admin settings are saved. Tests read
   * and write storage assuming no prefix, so reset it before anything runs
   * instead of relying on whichever prefix it booted with, or on an earlier
   * test happening to reset it.
   */
  async beforeAll() {
    try {
      const { accessToken } = await createUser({
        email: `root-hook-${Date.now()}@test.com`,
        isAdmin: true,
      });
      const response = await request(`${process.env.API_DOMAIN}/v1/`)
        .post("admin/settings")
        .set("Cookie", [`jwt=${accessToken}`])
        .send({
          bucketNames: { prefix: "" },
          settings: { platformPercent: 7 },
        });
      if (response.status !== 200) {
        console.warn(
          `rootHooks: couldn't reset the API's bucket prefix (HTTP ${response.status})`
        );
      }
    } catch (e) {
      // Some specs don't need the API; don't fail the whole run over this.
      console.warn(
        "rootHooks: couldn't reach the API to set the bucket prefix",
        e
      );
    } finally {
      await clearTables();
    }
  },
};
