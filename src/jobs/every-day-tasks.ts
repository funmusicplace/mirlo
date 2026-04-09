import sendOnboardingEmail from "./send-onboarding-email";
import sendSubscriptionRenewalReminders from "./send-subscription-renewal-reminders";

const triggerDailyTasks = async () => {
  await sendOnboardingEmail();
  await sendSubscriptionRenewalReminders();
};

triggerDailyTasks()
  .then(() => {
    console.log("Daily tasks completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Daily tasks failed:", error);
    process.exit(1);
  });
