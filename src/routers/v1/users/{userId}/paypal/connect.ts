import { User } from "@mirlo/prisma/client";
import { Request, Response } from "express";
import { userAuthenticated } from "../../../../../auth/passport";
import prisma from "@mirlo/prisma";

import logger from "../../../../../logger";
import { getSiteSettings } from "../../../../../utils/settings";
const { API_DOMAIN } = process.env;

const payPalPartnerReferralsUrl =
  "https://api-m.sandbox.paypal.com/v2/customer/partner-referrals";
const paypalAccessTokenUrl = "https://api-m.sandbox.paypal.com/v1/oauth2/token";

type Params = {
  userId: string;
};

const getPayPalAccessToken = async () => {
  const { settings } = await getSiteSettings();
  if (!settings?.paypalClientId || !settings?.paypalSecret) {
    throw new Error("PayPal client ID or secret is not set in settings");
  }
  const clientId = settings.paypalClientId;
  const secret = settings.paypalSecret;
  console.log("clientId", clientId, secret);
  const response = await fetch(paypalAccessTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }).toString(),
  });

  const json = (await response.json()) as { access_token?: string };
  console.log("PayPal access token response", json);
  if (!json.access_token) {
    throw new Error("Failed to get PayPal access token");
  }
  return json.access_token;
};

export default function () {
  const operations = {
    GET: [userAuthenticated, GET],
  };

  async function GET(req: Request, res: Response) {
    const { userId } = req.params as unknown as Params;
    const loggedInUser = req.user as User;

    try {
      if (Number(userId) === Number(loggedInUser.id)) {
        const user = await prisma.user.findUnique({
          where: { id: Number(userId) },
        });
        if (user) {
          let accountId = user.stripeAccountId;
          const alreadyExisted = !!accountId;

          logger.info(
            `Connecting ${user.id} to PayPal. Fetching an access token...`
          );
          const accessToken = await getPayPalAccessToken();
          logger.info(
            `Generating PayPal account link for accessToken ${accessToken}`
          );
          const result = await fetch(payPalPartnerReferralsUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              operations: [
                {
                  operation: "API_INTEGRATION",
                  api_integration_preference: {
                    rest_api_integration: {
                      integration_method: "PAYPAL",

                      integration_type: "THIRD_PARTY",

                      third_party_details: {
                        features: ["PAYMENT", "REFUND"],
                      },
                    },
                  },
                },
              ],
              products: ["EXPRESS_CHECKOUT"],
              legal_consents: [
                {
                  type: "SHARE_DATA_CONSENT",
                  granted: true,
                },
              ],
            }),
          });

          const response = await result.json();
          console.log("PayPal response", response);
          const resultJson = response as {
            links: { rel: string; href: string }[];
          };
          const accountLink = resultJson.links.find(
            (link: { rel: string }) => link.rel === "action_url"
          );
          const refreshLink = resultJson.links.find(
            (link: { rel: string }) => link.rel === "self"
          );

          if (!accountLink) {
            logger.error("No account link found in PayPal response");
            return res.status(500).json({
              error: "Failed to create PayPal account link",
            });
          }
          res.redirect(accountLink.href);
        }
      } else {
        res.status(401).json({
          error: "Invalid route",
        });
      }
    } catch (e) {
      console.error(e);
      res.json({
        error: `Failed to connect to PayPal: ${e instanceof Error ? e.message : e}`,
      });
    }
  }

  return operations;
}
