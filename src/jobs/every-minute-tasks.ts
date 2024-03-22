import addPostToNotifications from "./add-post-to-notifications";
import autoPurchaseNewAlbums from "./auto-purchase-new-albums";
import sendNotificationEmail from "./send-notification-email";

const everyMinuteTasks = async () => {
  await addPostToNotifications();
  await sendNotificationEmail();
  await autoPurchaseNewAlbums();
};

everyMinuteTasks();
