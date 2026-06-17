import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import Table from "components/common/Table";
import TextArea from "components/common/TextArea";
import WidthContainer from "components/common/WidthContainer";
import { queryFeaturedArtists } from "queries/settings";
import React from "react";
import { useForm } from "react-hook-form";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import FeaturedArtistsSelector from "./FeaturedArtistsSelector";

interface FormSettings {
  platformPercent: number;
  cdnUrl?: string;
  terms: string;
  privacyPolicy: string;
  cookiePolicy: string;
  contentPolicy: string;
  instanceCustomization?: SettingsFromAPI["settings"]["instanceCustomization"];
  stripe?: SettingsFromAPI["settings"]["stripe"];
  isClosedToPublicArtistSignup: boolean;
  showQueueDashboard: boolean;
  emailProvider?: SettingsFromAPI["settings"]["emailProvider"];
  s3?: SettingsFromAPI["settings"]["s3"];
  cloudflareTurnstileSecret?: string;
  defconLevel?: number;
}

interface SettingsFromAPI {
  cdnUrl?: string;
  settings: {
    platformPercent: number;
    instanceArtistId: number;
    instanceCustomization?: {
      colors?: {
        button?: string;
        buttonText?: string;
        background?: string;
        text?: string;
      };
      artistId?: string;
      title?: string;
      supportEmail?: string;
      purchaseEmail?: string;
      showHeroOnHome?: boolean;
    };
    stripe?: {
      key?: string;
      keyConfigured?: boolean;
      webhookSigningSecret?: string;
      webhookConnectSigningSecret?: string;
    };
    emailProvider?: {
      provider?: "sendgrid" | "mailgun";
      fromEmail?: string;
      sendgrid?: {
        apiKey?: string;
      };
      mailgun?: {
        apiKey?: string;
        domain?: string;
      };
      postmark?: {
        apiKey?: string;
      };
    };
    s3?: {
      keyId?: string;
      applicationKey?: string;
      keyName?: string;
      endpoint?: string;
      region?: string;
    };
    cloudflareTurnstileSecret?: string;
    featuredArtistIds?: number[];
  };
  terms: string;
  privacyPolicy: string;
  cookiePolicy: string;
  showQueueDashboard: boolean;
  isClosedToPublicArtistSignup: boolean;
  contentPolicy: string;
  defconLevel: number;
}

const colorInputClass = css`
  min-height: 2.5rem;
`;

const AdminSettings = () => {
  const snackbar = useSnackbar();
  const [isLoading, setIsLoading] = React.useState(false);
  const { reset, register, handleSubmit, watch } = useForm<FormSettings>();
  const stripeKeyConfigured = watch("stripe.keyConfigured");
  const { data: initialFeaturedArtists } = useQuery(queryFeaturedArtists());
  const [featuredArtistsOverride, setFeaturedArtistsOverride] = React.useState<
    Artist[] | undefined
  >(undefined);
  const featuredArtists =
    featuredArtistsOverride ?? initialFeaturedArtists ?? [];

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
        cdnUrl: response.result.cdnUrl,
        instanceCustomization: {
          ...(response.result.settings?.instanceCustomization ?? {
            colors: {
              button: "#be3455",
              buttonText: "#ffffff",
              background: "#ffffff",
              text: "#000000",
            },
          }),
        },
        stripe: {
          ...response.result.settings?.stripe,
          key: "",
        },
        emailProvider: {
          ...response.result.settings?.emailProvider,
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
            emailProvider: {
              ...data.emailProvider,
            },
            s3: {
              ...data.s3,
            },
            cloudflareTurnstileSecret: data.cloudflareTurnstileSecret,
            featuredArtistIds: featuredArtists.map((a) => a.id),
          },
          cdnUrl: data.cdnUrl,
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
    [snackbar, featuredArtists]
  );

  return (
    <WidthContainer variant="big" justify="center" className="p-4">
      <h3>Settings</h3>
      <form onSubmit={handleSubmit(updateSettings)}>
        <Table
          className={css`
            &.mi-table {
              border: none;
            }
          `}
        >
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
            <td>CDN URL</td>
            <td>
              <InputEl
                {...register("cdnUrl")}
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
                <label>Button Color</label>
                <InputEl
                  {...register("instanceCustomization.colors.button")}
                  type="color"
                  className={colorInputClass}
                />
              </FormComponent>
              <FormComponent>
                <label>Button Text Color</label>
                <InputEl
                  {...register("instanceCustomization.colors.buttonText")}
                  type="color"
                  className={colorInputClass}
                />
              </FormComponent>
              <FormComponent>
                <label>Text Color</label>
                <InputEl
                  {...register("instanceCustomization.colors.text")}
                  type="color"
                  className={colorInputClass}
                />
              </FormComponent>
              <FormComponent>
                <label>Background Color</label>
                <InputEl
                  {...register("instanceCustomization.colors.background")}
                  type="color"
                  className={colorInputClass}
                />
              </FormComponent>
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              <h3>Featured Artists</h3>
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              <FeaturedArtistsSelector
                value={featuredArtists}
                onChange={setFeaturedArtistsOverride}
              />
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
                type="password"
                placeholder={
                  stripeKeyConfigured
                    ? "sk_*** (leave blank to keep)"
                    : "No key set"
                }
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
              <h3>Email Provider Settings</h3>
            </td>
          </tr>
          <tr>
            <td>Email Provider</td>
            <td>
              <SelectEl {...register("emailProvider.provider")}>
                <option value="">None</option>
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
                <option value="postmark">Postmark</option>
              </SelectEl>
            </td>
          </tr>
          <tr>
            <td>From Email</td>
            <td>
              <InputEl
                {...register("emailProvider.fromEmail", {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email address",
                  },
                })}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          {/* SendGrid Settings */}
          <tr>
            <td colSpan={2}>
              <h4>SendGrid Settings</h4>
            </td>
          </tr>
          <tr>
            <td>API Key</td>
            <td>
              <InputEl
                {...register("emailProvider.sendgrid.apiKey")}
                type="password"
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          {/* Mailgun Settings */}
          <tr>
            <td colSpan={2}>
              <h4>Mailgun Settings</h4>
            </td>
          </tr>
          <tr>
            <td>API Key</td>
            <td>
              <InputEl
                {...register("emailProvider.mailgun.apiKey")}
                type="password"
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          <tr>
            <td>Domain</td>
            <td>
              <InputEl
                {...register("emailProvider.mailgun.domain")}
                className={css`
                  text-align: right;
                `}
              />
            </td>
          </tr>
          {/* Postmark Settings */}
          <tr>
            <td colSpan={2}>
              <h4>Postmark Settings</h4>
            </td>
          </tr>
          <tr>
            <td>API Key</td>
            <td>
              <InputEl
                {...register("emailProvider.postmark.apiKey")}
                // type="password"
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
    </WidthContainer>
  );
};

export default AdminSettings;
