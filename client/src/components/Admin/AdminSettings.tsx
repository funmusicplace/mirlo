import { css } from "@emotion/css";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import Table from "components/common/Table";
import TextArea from "components/common/TextArea";
import React from "react";
import { useForm } from "react-hook-form";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

interface FormSettings {
  platformPercent: number;
  instanceArtistId: number;
  terms: string;
  privacyPolicy: string;
  cookiePolicy: string;
  contentPolicy: string;
  stripeKey?: string;
  stripeWebhookSigningSecret?: string;
  stripeWebhookConnectSigningSecret?: string;
  isClosedToPublicArtistSignup: boolean;
  showQueueDashboard: boolean;

  sendgridApiKey?: string;
  sendgridFromEmail?: string;

  backblazeKeyId?: string;
  backblazeApplicationKey?: string;
  backblazeKeyName?: string;
  backblazeEndpoint?: string;
  backblazeRegion?: string;

  cloudflareTurnstileSecret?: string;
  defconLevel?: number;
}

interface SettingsFromAPI {
  settings: {
    platformPercent: number;
    instanceArtistId: number;
    stripeKey?: string;
    stripeWebhookSigningSecret?: string;
    stripeWebhookConnectSigningSecret?: string;
    sendgridApiKey?: string;
    sendgridFromEmail?: string;
    backblazeKeyId?: string;
    backblazeApplicationKey?: string;
    backblazeKeyName?: string;
    backblazeEndpoint?: string;
    backblazeRegion?: string;
    cloudflareTurnstileSecret?: string;
  };
  terms: string;
  privacyPolicy: string;
  cookiePolicy: string;
  showQueueDashboard: boolean;
  isClosedToPublicArtistSignup: boolean;
  contentPolicy: string;
  defconLevel: number;
}

const AdminSettings = () => {
  const snackbar = useSnackbar();
  const { reset, register, handleSubmit } = useForm<FormSettings>();

  React.useEffect(() => {
    const callback = async () => {
      const response =
        await api.get<Partial<SettingsFromAPI>>("admin/settings/");
      reset({
        isClosedToPublicArtistSignup:
          response.result.isClosedToPublicArtistSignup,
        showQueueDashboard: response.result.showQueueDashboard,
        platformPercent: response.result.settings?.platformPercent,
        instanceArtistId: response.result.settings?.instanceArtistId,
        stripeKey: response.result.settings?.stripeKey,
        stripeWebhookSigningSecret:
          response.result.settings?.stripeWebhookSigningSecret,
        stripeWebhookConnectSigningSecret:
          response.result.settings?.stripeWebhookConnectSigningSecret,
        sendgridApiKey: response.result.settings?.sendgridApiKey,
        sendgridFromEmail: response.result.settings?.sendgridFromEmail,
        backblazeKeyId: response.result.settings?.backblazeKeyId,
        backblazeApplicationKey:
          response.result.settings?.backblazeApplicationKey,
        backblazeKeyName: response.result.settings?.backblazeKeyName,
        backblazeEndpoint: response.result.settings?.backblazeEndpoint,
        backblazeRegion: response.result.settings?.backblazeRegion,
        cloudflareTurnstileSecret:
          response.result.settings?.cloudflareTurnstileSecret,
        terms: response.result.terms,
        privacyPolicy: response.result.privacyPolicy,
        cookiePolicy: response.result.cookiePolicy,
        contentPolicy: response.result.contentPolicy,
        defconLevel: response.result.defconLevel,
      });
    };
    callback();
  }, [reset]);

  const updateSettings = React.useCallback(
    async (data: Partial<FormSettings>) => {
      try {
        await api.post("admin/settings", {
          settings: {
            platformPercent: data.platformPercent,
            instanceArtistId: Number(data.instanceArtistId),
            stripeKey: data.stripeKey,
            stripeWebhookSigningSecret: data.stripeWebhookSigningSecret,
            stripeWebhookConnectSigningSecret:
              data.stripeWebhookConnectSigningSecret,
            sendgridApiKey: data.sendgridApiKey,
            sendgridFromEmail: data.sendgridFromEmail,
            backblazeKeyId: data.backblazeKeyId,
            backblazeApplicationKey: data.backblazeApplicationKey,
            backblazeKeyName: data.backblazeKeyName,
            backblazeEndpoint: data.backblazeEndpoint,
            backblazeRegion: data.backblazeRegion,
            cloudflareTurnstileSecret: data.cloudflareTurnstileSecret,
          },
          terms: data.terms,
          showQueueDashboard: data.showQueueDashboard,
          isClosedToPublicArtistSignup: data.isClosedToPublicArtistSignup,
          privacyPolicy: data.privacyPolicy,
          cookiePolicy: data.cookiePolicy,
          contentPolicy: data.contentPolicy,
          defconLevel: Number(data.defconLevel),
        });
      } catch (e) {
        console.error(e);
        snackbar("Oops something went wrong", { type: "warning" });
      }
    },
    [snackbar]
  );

  return (
    <div>
      <h3>Settings</h3>
      <form onSubmit={handleSubmit(updateSettings)}>
        <Table>
          <tr>
            <td>Platform percent</td>
            <td>
              <InputEl
                {...register("platformPercent")}
                type="number"
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>Is closed to public artist signup</td>
            <td>
              <InputEl
                {...register("isClosedToPublicArtistSignup")}
                type="checkbox"
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>Show queue dashboard</td>
            <td>
              <InputEl
                {...register("showQueueDashboard")}
                type="checkbox"
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>Instance artist ID</td>
            <td>
              <InputEl
                {...register("instanceArtistId")}
                type="number"
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>stripeKey</td>
            <td>
              <InputEl
                {...register("stripeKey")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>stripeWebhookSigningSecret</td>
            <td>
              <InputEl
                {...register("stripeWebhookSigningSecret")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>sendgridApiKey</td>
            <td>
              <InputEl
                {...register("sendgridFromEmail")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>{" "}
          <tr>
            <td>backblazeKeyId</td>
            <td>
              <InputEl
                {...register("backblazeKeyId")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>{" "}
          <tr>
            <td>backblazeApplicationKey</td>
            <td>
              <InputEl
                {...register("backblazeApplicationKey")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>{" "}
          <tr>
            <td>backblazeKeyName</td>
            <td>
              <InputEl
                {...register("backblazeKeyName")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>backblazeEndpoint</td>
            <td>
              <InputEl
                {...register("backblazeEndpoint")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>backblazeRegion</td>
            <td>
              <InputEl
                {...register("backblazeRegion")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>cloudflareTurnstileSecret</td>
            <td>
              <InputEl
                {...register("cloudflareTurnstileSecret")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>backblazeRegion</td>
            <td>
              <InputEl
                {...register("backblazeRegion")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>Terms and Conditions Markdown</td>
            <td>
              <TextArea {...register("terms")} rows={10} />
            </td>
          </tr>
          <tr>
            <td>Privacy Policy Markdown</td>
            <td>
              <TextArea {...register("privacyPolicy")} rows={10} />
            </td>
          </tr>
          <tr>
            <td>Cookie Policy Markdown</td>
            <td>
              <TextArea {...register("cookiePolicy")} rows={10} />
            </td>
          </tr>
          <tr>
            <td>Content Policy Markdown</td>
            <td>
              <TextArea {...register("contentPolicy")} rows={10} />
            </td>
          </tr>
          <tr>
            <td>defconLevel</td>
            <td>
              <InputEl
                {...register("defconLevel")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
        </Table>
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
};

export default AdminSettings;
