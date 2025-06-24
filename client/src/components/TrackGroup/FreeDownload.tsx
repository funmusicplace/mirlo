import Button from "components/common/Button";
import React from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

import { Input } from "components/common/Input";
import FormComponent from "components/common/FormComponent";
import { useAuthContext } from "state/AuthContext";
import { ArtistButton } from "components/Artist/ArtistButtons";
import Box from "components/common/Box";

const FreeDownload: React.FC<{
  trackGroup: TrackGroup;
  chosenPrice: string;
}> = ({ trackGroup, chosenPrice }) => {
  const { user } = useAuthContext();
  const [email, setEmail] = React.useState(user?.email);
  const [isLoading, setIsloading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", { keyPrefix: "trackGroupCard" });

  const downloadAlbumAnyway = React.useCallback(async () => {
    try {
      setIsloading(true);
      await api.post(`trackGroups/${trackGroup.id}/emailDownload`, { email });
      snackbar(t("emailSent"), { type: "warning" });
      setEmailSent(true);
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    } finally {
      setIsloading(false);
    }
  }, [email, snackbar, t, trackGroup.id]);

  const lessThan1 = Number.isNaN(Number(chosenPrice))
    ? true
    : Number(chosenPrice) < 1;

  if (emailSent) {
    return <Box variant="success">{t("emailSent")}</Box>;
  }

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
            <ArtistButton
              type="submit"
              isLoading={isLoading}
              onClick={(e) => {
                e.preventDefault();
                downloadAlbumAnyway();
              }}
            >
              {t("getDownloadLink")}
            </ArtistButton>
          </form>
        </div>
      )}
    </>
  );
};

export default FreeDownload;
