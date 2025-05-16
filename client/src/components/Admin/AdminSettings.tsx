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
}

interface SettingsFromAPI {
  settings: {
    platformPercent: number;
    instanceArtistId: number;
  };
  terms: string;
  privacyPolicy: string;
  cookiePolicy: string;
  contentPolicy: string;
}

const AdminSettings = () => {
  const snackbar = useSnackbar();
  const { reset, register, handleSubmit } = useForm<FormSettings>();

  React.useEffect(() => {
    const callback = async () => {
      const response =
        await api.get<Partial<SettingsFromAPI>>("admin/settings/");
      reset({
        platformPercent: response.result.settings?.platformPercent,
        instanceArtistId: response.result.settings?.instanceArtistId,
        terms: response.result.terms,
        privacyPolicy: response.result.privacyPolicy,
        cookiePolicy: response.result.cookiePolicy,
        contentPolicy: response.result.contentPolicy,
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
          },
          terms: data.terms,
          privacyPolicy: data.privacyPolicy,
          cookiePolicy: data.cookiePolicy,
          contentPolicy: data.contentPolicy,
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
        </Table>
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
};

export default AdminSettings;
