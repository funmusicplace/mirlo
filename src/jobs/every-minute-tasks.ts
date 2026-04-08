import sendPostToActivityPubFollowers from "./send-post-to-activitypub-followers";
import { triggerAutoPurchaseNewAlbums } from "./trigger-auto-purchase-new-albums";
import { triggerPostNotifications } from "./trigger-post-notifications";

const everyMinuteTasks = async () => {
  // 1. Discover posts ready to notify (both manually published and scheduled)
  await triggerPostNotifications();

  // 2. Send to external platforms (ActivityPub)
  await sendPostToActivityPubFollowers();

  // 3. Handle business logic (auto-purchases, etc.)
  await triggerAutoPurchaseNewAlbums();
};

everyMinuteTasks()
  .then(() => {
    console.log("Every minute tasks completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Every minute tasks failed:", error);
    process.exit(1);
  });
