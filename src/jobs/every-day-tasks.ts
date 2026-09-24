import { logger } from "./queue-worker";
import sendOnboardingEmail from "./send-onboarding-email";
import sendSubscriptionRenewalReminders from "./send-subscription-renewal-reminders";
import syncPaymentAccountStatuses from "./tasks/sync-payment-account-statuses";

const triggerDailyTasks = async () => {
  await sendOnboardingEmail();
  await sendSubscriptionRenewalReminders();
  await syncPaymentAccountStatuses();
};

triggerDailyTasks()
  .then(() => {
    logger.info("Daily tasks completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Daily tasks failed:", error);
    process.exit(1);
  });
