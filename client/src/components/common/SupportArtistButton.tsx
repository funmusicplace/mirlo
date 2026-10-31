import { ArtistButton } from "components/Artist/ArtistButtons";
import React from "react";
import { useTranslation } from "react-i18next";
import useIsSubscribedToArtist from "utils/useIsSubscribedToArtist";

import { ButtonProps } from "./Button";
import Modal from "./Modal";
import SpaceBetweenDiv from "./SpaceBetweenDiv";
import SupportArtistTiersForm from "./SupportArtistTiersForm";

const SupportArtistButton: React.FC<
  {
    artist: Pick<
      Artist,
      "id" | "name" | "userId" | "urlSlug" | "subscriptionTiers"
    >;
    label?: string;
  } & Pick<ButtonProps, "size" | "rounded" | "wrap">
> = ({ artist, label, size, rounded, wrap }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const isSubscribed = useIsSubscribedToArtist(artist.id);

  return (
    <>
      <ArtistButton
        wrap={wrap}
        size={size}
        rounded={rounded}
        onClick={() => setIsOpen(true)}
      >
        {isSubscribed
          ? t("manageArtistSubscription")
          : (label ?? t("supportArtist", { artist: artist.name }))}
      </ArtistButton>
      <Modal
        title={t("supportArtist", { artist: artist.name }) ?? ""}
        open={isOpen}
        size="small"
        onClose={() => setIsOpen(false)}
      >
        <SpaceBetweenDiv>
          <div>{t("chooseATier", { artistName: artist.name })}</div>
        </SpaceBetweenDiv>
        <SupportArtistTiersForm
          artist={artist}
          onFinishedSubscribing={() => setIsOpen(false)}
        />
      </Modal>
    </>
  );
};

export default SupportArtistButton;
