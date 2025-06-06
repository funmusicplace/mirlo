import sendOnboardingEmail from "./send-onboarding-email";

const triggerDailyTasks = async () => {
  await sendOnboardingEmail();
};

triggerDailyTasks();
