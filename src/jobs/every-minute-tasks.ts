import addPostToNotifications from "./add-post-to-notifications";
import autoPurchaseNewAlbums from "./auto-purchase-new-albums";
import sendNotificationEmail from "./send-notification-email";
import sendPostToActivityPubFollowers from "./send-post-to-activitypub-followers";

const everyMinuteTasks = async () => {
  await addPostToNotifications();
  await sendNotificationEmail();
  await autoPurchaseNewAlbums();
  await sendPostToActivityPubFollowers();
};

everyMinuteTasks();
