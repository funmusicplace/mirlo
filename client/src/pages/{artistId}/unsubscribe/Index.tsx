import { css } from "@emotion/css";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import { WidthWrapper } from "components/common/WidthContainer";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistUrl } from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";

function Index() {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const email = params.get("email");
  const errorHandler = useErrorHandler();

  const { register, handleSubmit } = useForm({
    defaultValues: { email },
  });

  const { data: artist, isPending } = useArtistQuery();
  const artistId = artist?.id;

  const unsubscribe = React.useCallback(
    async (data: { email: string | null }) => {
      if (data.email && artist) {
        try {
          await api.post(`artists/${artistId}/unfollow`, {
            email: email?.replaceAll(" ", ""),
          });
          snackbar(t("successfullyUnsubscribed"), { type: "success" });
          navigate(getArtistUrl(artist));
        } catch (e) {
          errorHandler(e);
        }
      }
    },
    [artist, artistId, email, snackbar, navigate]
  );

  if (isPending) {
    return <LoadingBlocks />;
  }

  if (!artist) {
    return null;
  }

  return (
    <WidthWrapper variant="small">
      <form
        onSubmit={handleSubmit(unsubscribe)}
        className={css`
          padding: 2rem 0;

          p {
            margin-bottom: 1rem;
          }

          label {
            font-weight: bold;
          }

          button {
            margin-top: 1rem;
          }
        `}
      >
        <p>{t("unsubscribeFromArtist", { artistName: artist.name })}</p>
        <label>{t("enterEmail")}</label>
        <InputEl {...register("email")} type="email" required />
        <Button type="submit">
          {t("stopReceivingUpdates", { artistName: artist.name })}
        </Button>
      </form>
    </WidthWrapper>
  );
}

export default Index;
