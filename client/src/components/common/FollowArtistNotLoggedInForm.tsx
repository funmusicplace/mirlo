import React from "react";
import FormComponent from "./FormComponent";
import Input from "./Input";
import { useTranslation } from "react-i18next";
import Button from "./Button";
import { useSnackbar } from "state/SnackbarContext";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";

const FollowArtistNotLoggedInForm: React.FC<{ artistId: number }> = ({
  artistId,
}) => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const snackbar = useSnackbar();

  const [email, setEmail] = React.useState(user?.email);

  const followArtist = React.useCallback(async () => {
    try {
      await api.post(`artists/${artistId}/follow`, { email });
      snackbar(t("subscribedSuccessfully", { type: "success" }));
    } catch (e) {
      snackbar(t("error"), { type: "warning" });
      console.error(e);
    }
  }, [email, snackbar, t, artistId]);

  return (
    <form>
      <p>{t("toFollowThisArtist", {artistName: artist.name})}</p>
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
      <Button
        type="submit"
        onClick={(e) => {
          e.preventDefault();
          followArtist();
        }}
      >
        {t("subscribe")}
      </Button>
    </form>
  );
};

export default FollowArtistNotLoggedInForm;
