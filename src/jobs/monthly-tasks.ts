import cleanUpTrackGroups from "./clean-up-trackgroups";
import sendOutMonthlyReceipts from "./send-out-monthly-receipts";

const triggerMonthlyTasks = async () => {
  await sendOutMonthlyReceipts();
  await cleanUpTrackGroups();
};

triggerMonthlyTasks();
