import { Job } from "bullmq";
import sendMail from "../../src/jobs/send-mail";

describe("sendMail", () => {
  it("should send mail", () => {
    sendMail({
      data: {
        template: "album-purchase-artist-notification",
        locals: {
          email: "test@test.com",
          trackGroup: {
            artist: {
              id: 1,
              user: {
                name: "John",
              },
            },
            title: "Test album",
          },
          pricePaid: 20,
          platformPercent: 7,
          platformCut: 1.4,
          purchase: {
            currencyPaid: "usd",
          },
        },
        message: {
          to: "test@test.com",
        },
      },
    } as Job);
  });
});
