import addPostToNotifications from "./add-post-to-notifications";
import sendNotificationEmail from "./send-notification-email";

const everyMinuteTasks = async () => {
  await addPostToNotifications();
  await sendNotificationEmail();
};

everyMinuteTasks();
