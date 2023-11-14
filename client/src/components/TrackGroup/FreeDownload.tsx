import Button from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { Input } from "components/common/Input";
import FormComponent from "components/common/FormComponent";
import { useGlobalStateContext } from "state/GlobalState";

const FreeDownload: React.FC<{
  trackGroup: TrackGroup;
  chosenPrice: string;
}> = ({ trackGroup, chosenPrice }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const [email, setEmail] = React.useState(user?.email);
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const downloadAlbumAnyway = React.useCallback(async () => {
    try {
      await api.post<{}, { sessionUrl: string }>(
        `trackGroups/${trackGroup.id}/emailDownload`,
        { email }
      );
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    }
  }, [email, snackbar, t, trackGroup.id]);

  const lessThan1 = Number.isNaN(Number(chosenPrice))
    ? true
    : Number(chosenPrice) < 1;

  return (
    <>
      {lessThan1 && (
        <div style={{ marginTop: "1rem" }}>
          <strong>
            {t("moreThan1", {
              currency: trackGroup.currency,
              artistName: trackGroup.artist?.name,
            })}
          </strong>
          <form style={{ marginTop: "1rem" }}>
            <p style={{ marginBottom: "1rem" }}>
              {t(user ? "justDownloadLoggedIn" : "justDownloadNoUser")}
            </p>
            {!user && (
              <FormComponent>
                {t("email")}
                <Input
                  name="email"
                  type="email"
                  value={email}
                  required
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value);
                  }}
                />
              </FormComponent>
            )}
            <Button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                downloadAlbumAnyway();
              }}
            >
              {t("getDownloadLink")}
            </Button>
          </form>
        </div>
      )}
    </>
  );
};

export default FreeDownload;
