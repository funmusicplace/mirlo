import { Job } from "bullmq";

import { sendMail } from "../../jobs/send-mail";
import { getClient } from "../../utils/getClient";

export type VerificationAccountType = "artist" | "listener" | "label";

export interface VerificationEmailParams<UserType> {
  user: UserType;
  clientId: number;
  accountType: VerificationAccountType;
}

export const normalizeAccountType = (
  value?: string
): VerificationAccountType => {
  switch (value?.toLowerCase()) {
    case "artist":
      return "artist";
    case "label":
      return "label";
    default:
      return "listener";
  }
};

export const sendVerificationEmail = async <UserType extends { email: string }>(
  params: VerificationEmailParams<UserType>
) => {
  const { user, clientId, accountType } = params;

  const client = await getClient();

  await sendMail({
    data: {
      template: "new-user",
      message: {
        to: user.email,
      },
      locals: {
        accountType,
        user,
        host: process.env.API_DOMAIN,
        client: clientId,
        clientDomain: client.applicationUrl,
      },
    },
  } as Job);
};
