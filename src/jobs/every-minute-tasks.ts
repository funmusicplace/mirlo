import "dotenv/config";

import logger from "../logger";

import { endScheduledPreorders } from "./end-scheduled-preorders";
import { triggerAutoPurchaseNewAlbums } from "./trigger-auto-purchase-new-albums";
import { triggerPostNotifications } from "./trigger-post-notifications";
import { triggerTrackGroupPublishNotifications } from "./trigger-trackgroup-publish-notifications";

export const everyMinuteTasks = async () => {
  await triggerPostNotifications();
  await triggerAutoPurchaseNewAlbums();
  await endScheduledPreorders();
  await triggerTrackGroupPublishNotifications();
};

if (require.main === module) {
  everyMinuteTasks()
    .then(() => {
      logger.info("Every minute tasks completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Every minute tasks failed:", error);
      process.exit(1);
    });
}
