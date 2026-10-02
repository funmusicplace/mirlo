import * as dotenv from "dotenv";
dotenv.config();
import request from "supertest";

import { clearTables, createUser } from "./utils";

/**
 * Hooks that run once around the whole Mocha run (registered in .mocharc.js).
 */
export const mochaHooks = {
  /**
   * The API process keeps its bucket layout (legacy or consolidated) in
   * memory, set at boot from the Settings row and changed whenever admin
   * settings are saved. Tests read and write storage assuming legacy mode
   * unless they switch both sides themselves, so put the API into legacy
   * mode before anything runs instead of relying on whichever layout it
   * booted with, or on an earlier test happening to reset it.
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
        .send({ bucketNames: null, settings: { platformPercent: 7 } });
      if (response.status !== 200) {
        console.warn(
          `rootHooks: couldn't put the API into legacy bucket mode (HTTP ${response.status})`
        );
      }
    } catch (e) {
      // Some specs don't need the API; don't fail the whole run over this.
      console.warn("rootHooks: couldn't reach the API to set bucket mode", e);
    } finally {
      await clearTables();
    }
  },
};
