import sendOnboardingEmail from "./send-onboarding-email";
import sendSubscriptionRenewalReminders from "./send-subscription-renewal-reminders";

const triggerDailyTasks = async () => {
  await sendOnboardingEmail();
  await sendSubscriptionRenewalReminders();
};

triggerDailyTasks();
