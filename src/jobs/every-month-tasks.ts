// import cleanUpFiles from "./clean-up-files";
import cleanUpTrackGroups from "./clean-up-trackgroups";
import cleanUpUserAccounts from "./clean-up-user-accounts";
import sendOutMonthlyReceipts from "./send-out-monthly-receipts";
import sendOutMonthlyIncomeReport from "./send-out-monthy-income-report";

const triggerMonthlyTasks = async () => {
  await sendOutMonthlyReceipts();
  await sendOutMonthlyIncomeReport();
  await cleanUpTrackGroups();
  await cleanUpUserAccounts();
  // await cleanUpFiles();
};

triggerMonthlyTasks();
