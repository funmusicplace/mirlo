import { endScheduledPreorders } from "./end-scheduled-preorders";
import { logger } from "./queue-worker";
import sendPostToActivityPubFollowers from "./send-post-to-activitypub-followers";
import { triggerAutoPurchaseNewAlbums } from "./trigger-auto-purchase-new-albums";
import { triggerPostNotifications } from "./trigger-post-notifications";
import { triggerTrackGroupPublishNotifications } from "./trigger-trackgroup-publish-notifications";

const everyMinuteTasks = async () => {
  await triggerPostNotifications();
  await sendPostToActivityPubFollowers();
  await triggerAutoPurchaseNewAlbums();
  await endScheduledPreorders();
  await triggerTrackGroupPublishNotifications();
};

everyMinuteTasks()
  .then(() => {
    logger.info("Every minute tasks completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Every minute tasks failed:", error);
    process.exit(1);
  });
