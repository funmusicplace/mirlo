import { css } from "@emotion/css";
import { Turnstile } from "@marsidev/react-turnstile";
import { ArtistButton } from "components/Artist/ArtistButtons";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";

import FormComponent from "./FormComponent";
import { InputEl } from "./Input";

const FollowArtistWithEmail: React.FC<{
  artist: Pick<Artist, "id" | "name">;
}> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user, refreshLoggedInUser } = useAuthContext();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();

  const [isLoading, setIsLoading] = React.useState(false);
  const cfTurnstile = React.useRef<string | undefined>(undefined);

  const { register, handleSubmit } = useForm<{ email: string }>();

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      setIsLoading(true);
      await api.post(`artists/${artist.id}/follow`, {
        email,
        cfTurnstile: cfTurnstile.current,
      });
      if (user) {
        await refreshLoggedInUser();
        snackbar(t("followingArtist", { artistName: artist.name }), {
          type: "success",
        });
      } else {
        snackbar(t("verificationEmailSent"), { type: "success" });
      }
    } catch (e) {
      errorHandler(e);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <p
        className={css`
          margin-bottom: 1rem;
        `}
      >
        {t("followWithEmailDescription", { artistName: artist.name })}
      </p>
      {!user && (
        <FormComponent>
          {t("email")}
          <InputEl {...register("email")} type="email" required />
        </FormComponent>
      )}
      <ArtistButton
        type="submit"
        isLoading={isLoading}
        className={css`
          width: 100% !important;
          margin-top: 0.25rem;
        `}
      >
        {t("followArtist", { artistName: artist.name })}
      </ArtistButton>
      {!user && (
        <div
          className={css`
            display: flex;
            justify-content: center;
            margin-top: 1rem;
          `}
        >
          <Turnstile
            siteKey={import.meta.env.VITE_CLOUDFLARE_CLIENT_KEY}
            onSuccess={(token) => {
              cfTurnstile.current = token;
            }}
          />
        </div>
      )}
    </form>
  );
};

export default FollowArtistWithEmail;
