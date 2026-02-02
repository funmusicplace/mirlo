import { css } from "@emotion/css";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Table from "components/common/Table";
import TextArea from "components/common/TextArea";
import React from "react";
import { useForm } from "react-hook-form";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

interface FormSettings {
  platformPercent: number;
  terms: string;
  privacyPolicy: string;
  cookiePolicy: string;
  contentPolicy: string;
  instanceCustomization?: SettingsFromAPI["settings"]["instanceCustomization"];
  stripe?: SettingsFromAPI["settings"]["stripe"];
  isClosedToPublicArtistSignup: boolean;
  showQueueDashboard: boolean;
  sendgrid?: SettingsFromAPI["settings"]["sendgrid"];
  s3?: SettingsFromAPI["settings"]["s3"];
  cloudflareTurnstileSecret?: string;
  defconLevel?: number;
}

interface SettingsFromAPI {
  settings: {
    platformPercent: number;
    instanceArtistId: number;
    instanceCustomization?: {
      colors?: {
        primary?: string;
        secondary?: string;
        background?: string;
        foreground?: string;
      };
      artistId?: string;
      title?: string;
      supportEmail?: string;
      purchaseEmail?: string;
      showHeroOnHome?: boolean;
    };
    stripe?: {
      key?: string;
      webhookSigningSecret?: string;
      webhookConnectSigningSecret?: string;
    };
    sendgrid?: {
      apiKey?: string;
      fromEmail?: string;
    };
    s3?: {
      keyId?: string;
      applicationKey?: string;
      keyName?: string;
      endpoint?: string;
      region?: string;
    };
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
  const [isLoading, setIsLoading] = React.useState(false);
  const { reset, register, handleSubmit } = useForm<FormSettings>();

  React.useEffect(() => {
    const callback = async () => {
      setIsLoading(true);
      const response =
        await api.get<Partial<SettingsFromAPI>>("admin/settings/");
      reset({
        isClosedToPublicArtistSignup:
          response.result.isClosedToPublicArtistSignup,
        showQueueDashboard: response.result.showQueueDashboard,
        platformPercent: response.result.settings?.platformPercent,
        instanceCustomization: {
          ...(response.result.settings?.instanceCustomization ?? {
            colors: {
              primary: "#be3455",
              secondary: "#ffffff",
              background: "#ffffff",
              foreground: "#000000",
            },
          }),
        },
        stripe: {
          ...response.result.settings?.stripe,
        },
        sendgrid: {
          ...response.result.settings?.sendgrid,
        },
        s3: {
          ...response.result.settings?.s3,
        },
        cloudflareTurnstileSecret:
          response.result.settings?.cloudflareTurnstileSecret,
        terms: response.result.terms,
        privacyPolicy: response.result.privacyPolicy,
        cookiePolicy: response.result.cookiePolicy,
        contentPolicy: response.result.contentPolicy,
        defconLevel: response.result.defconLevel,
      });
      setIsLoading(false);
      snackbar("Settings loaded", { type: "success" });
    };
    callback();
  }, [reset]);

  const updateSettings = React.useCallback(
    async (data: Partial<FormSettings>) => {
      try {
        await api.post("admin/settings", {
          settings: {
            platformPercent: data.platformPercent,
            instanceCustomization: {
              ...data.instanceCustomization,
            },
            stripe: {
              ...data.stripe,
            },
            sendgrid: {
              ...data.sendgrid,
            },
            s3: {
              ...data.s3,
            },
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
        snackbar("Settings updated", { type: "success" });
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
            <h3>General Settings</h3>
          </tr>
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
            <td>Show hero on home</td>
            <td>
              <InputEl
                {...register("instanceCustomization.showHeroOnHome")}
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
                {...register("instanceCustomization.artistId")}
                type="number"
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>Colors</td>
            <td>
              <FormComponent>
                <label>Primary Color</label>
                <InputEl
                  {...register("instanceCustomization.colors.primary")}
                  type="color"
                  className={css`
                    text-align: right;
                  `}
                />
              </FormComponent>
              <FormComponent>
                <label>Secondary Color</label>
                <InputEl
                  {...register("instanceCustomization.colors.secondary")}
                  type="color"
                  className={css`
                    text-align: right;
                  `}
                />
              </FormComponent>
              <FormComponent>
                <label>Foreground Color</label>
                <InputEl
                  {...register("instanceCustomization.colors.foreground")}
                  type="color"
                  className={css`
                    text-align: right;
                  `}
                />
              </FormComponent>
              <FormComponent>
                <label>Background Color</label>
                <InputEl
                  {...register("instanceCustomization.colors.background")}
                  type="color"
                  className={css`
                    text-align: right;
                  `}
                />
              </FormComponent>
            </td>
          </tr>
          <tr>
            <td>
              <h3>Stripe Settings</h3>
            </td>
          </tr>
          <tr>
            <td>stripeKey</td>
            <td>
              <InputEl
                {...register("stripe.key")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>webhookConnectSigningSecret</td>
            <td>
              <InputEl
                {...register("stripe.webhookConnectSigningSecret")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>
              <h3>SendGrid Settings</h3>
            </td>
          </tr>
          <tr>
            <td>apiKey</td>
            <td>
              <InputEl
                {...register("sendgrid.apiKey")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>fromEmail</td>
            <td>
              <InputEl
                {...register("sendgrid.fromEmail")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>
              <h3>S3 Settings</h3>
            </td>
          </tr>
          <tr>
            <td>keyId</td>
            <td>
              <InputEl
                {...register("s3.keyId")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>{" "}
          <tr>
            <td>applicationKey</td>
            <td>
              <InputEl
                {...register("s3.applicationKey")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>{" "}
          <tr>
            <td>keyName</td>
            <td>
              <InputEl
                {...register("s3.keyName")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>endpoint</td>
            <td>
              <InputEl
                {...register("s3.endpoint")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>region</td>
            <td>
              <InputEl
                {...register("s3.region")}
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
            <td>
              <h3>Security</h3>
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
        <Button type="submit" isLoading={isLoading}>
          Save
        </Button>
      </form>
    </div>
  );
};

export default AdminSettings;
