import "dotenv/config";

import logger from "../logger";

import sendOnboardingEmail from "./send-onboarding-email";
import sendSubscriptionRenewalReminders from "./send-subscription-renewal-reminders";
import cleanUpCheckouts from "./tasks/clean-up-checkouts";
import syncPaymentAccountStatuses from "./tasks/sync-payment-account-statuses";

export const dailyTasks = async () => {
  await sendOnboardingEmail();
  await sendSubscriptionRenewalReminders();
  await syncPaymentAccountStatuses();
  await cleanUpCheckouts();
};

if (require.main === module) {
  dailyTasks()
    .then(() => {
      logger.info("Daily tasks completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Daily tasks failed:", error);
      process.exit(1);
    });
}
