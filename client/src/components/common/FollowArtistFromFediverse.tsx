import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";

import FormComponent from "./FormComponent";
import { InputEl } from "./Input";

const FollowArtistFromFediverse: React.FC<{
  artist: Pick<Artist, "id" | "name">;
}> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const errorHandler = useErrorHandler();

  const [isLoading, setIsLoading] = React.useState(false);
  const { register, handleSubmit } = useForm<{ handle: string }>();

  const onSubmit = handleSubmit(async ({ handle }) => {
    try {
      setIsLoading(true);
      const { result } = await api.get<{ redirectUrl: string }>(
        `artists/${artist.id}/remoteFollow?handle=${encodeURIComponent(handle)}`
      );
      window.location.href = result.redirectUrl;
    } catch (e) {
      errorHandler(e);
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
        {t("followFromFediverseDescription", { artistName: artist.name })}
      </p>
      <FormComponent>
        {t("fediverseHandle")}
        <InputEl
          {...register("handle")}
          type="text"
          placeholder={t("fediverseHandlePlaceholder") ?? ""}
          required
        />
      </FormComponent>
      <ArtistButton
        type="submit"
        isLoading={isLoading}
        className={css`
          width: 100% !important;
          margin-top: 0.25rem;
        `}
      >
        {t("continueToYourServer")}
      </ArtistButton>
    </form>
  );
};

export default FollowArtistFromFediverse;
