export const sendBasecampAMessage = async (msgAsHtml: string) => {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.BASECAMP_CHATBOT_URL
  ) {
    await fetch(process.env.BASECAMP_CHATBOT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Add Authorization header if required, e.g.:
        // Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: `content=${msgAsHtml}`,
    });
  }
};
