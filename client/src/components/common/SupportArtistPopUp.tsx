import React from "react";
import Button from "./Button";
import Modal from "./Modal";
import SpaceBetweenDiv from "./SpaceBetweenDiv";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import FollowArtist from "./FollowArtist";

import { useAuthContext } from "state/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { queryUserStripeStatus } from "queries";
import SupportArtistTiersForm from "./SupportArtistTiersForm";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { css } from "@emotion/css";

const SupportArtistPopUp: React.FC<{
  artist: Pick<Artist, "id" | "name" | "userId" | "urlSlug">;
}> = ({ artist }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const methods = useForm<{
    tier: {
      id: number;
      name: string;
      description: string;
      isDefaultTier: boolean;
    };
    email: string;
  }>();

  const { user } = useAuthContext();

  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist.userId)
  );

  React.useEffect(() => {
    if (isOpen) {
      const foundTier = user?.artistUserSubscriptions?.find(
        (sub) => sub.artistSubscriptionTier.artistId === artist.id
      )?.artistSubscriptionTier;
      if (foundTier) {
        methods.setValue("tier", foundTier);
      }
    }
  }, [artist.id, isOpen, methods, user?.artistUserSubscriptions]);

  if (!stripeAccountStatus?.chargesEnabled) {
    return (
      <div
        className={css`
          text-align: center;
          display: flex;
          justify-content: center;
          margin: 1rem;
        `}
      >
        <FollowArtist artistId={artist.id} />
      </div>
    );
  }

  return (
    <div
      className={css`
        text-align: center;
        display: flex;
        justify-content: center;
        margin: 1rem;
      `}
    >
      <ArtistButton size="big" rounded onClick={() => setIsOpen(true)}>
        {t("subscribeToArtist", { artist: artist.name })}
      </ArtistButton>
      <Modal
        title={t("supportArtist", { artist: artist.name }) ?? ""}
        open={isOpen}
        size="small"
        onClose={() => setIsOpen(false)}
      >
        <SpaceBetweenDiv>
          <div>{t("chooseATier")}</div>
        </SpaceBetweenDiv>
        <SupportArtistTiersForm
          artist={artist}
          onFinishedSubscribing={() => setIsOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default SupportArtistPopUp;
