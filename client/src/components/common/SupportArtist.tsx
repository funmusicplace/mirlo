import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { queryArtist, queryUserStripeStatus } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaDonate } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import useGetArtistSubscriptionTiers from "utils/useGetArtistSubscriptionTiers";

import Button, { ButtonProps } from "./Button";
import { FixedButton } from "./FixedButton";
import SupportArtistTiersForm from "./SupportArtistTiersForm";
import TipArtistModal from "./TipArtistModal";
import UnsubscribeButton from "./UnsubscribeButton";

const SupportArtist: React.FC<{
  artistId: number;
  fixed?: boolean;
  compact?: boolean;
  label?: string;
  variant?: ButtonProps["variant"];
}> = ({
  artistId,
  fixed = false,
  compact = false,
  label,
  variant = "outlined",
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user } = useAuthContext();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: `${artistId}`, includeDefaultTier: true })
  );
  const { hasNonDefaultTiers } = useGetArtistSubscriptionTiers(artist?.urlSlug);
  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );

  const [isTipPopUpOpen, setIsTipPopUpOpen] = React.useState(false);

  const onTipClick = React.useCallback(() => {
    setIsTipPopUpOpen(true);
  }, []);

  if (!artist || !stripeAccountStatus?.chargesEnabled) {
    return null;
  }

  const button = fixed ? (
    <FixedButton
      className="tip-artist"
      onClick={onTipClick}
      startIcon={<FaDonate />}
      rounded
      collapsible
      size="compact"
    >
      {label ?? t("tipArtist")}
    </FixedButton>
  ) : compact ? (
    <ArtistButton
      variant={variant}
      className={`tip-artist ${css`
        font-size: 0.75em !important;
        ${variant === "outlined"
          ? "background-color: var(--mi-button-tint-color) !important;"
          : ""}
      `}`}
      size="compact"
      type="button"
      onClick={onTipClick}
      startIcon={<FaDonate />}
    >
      {label ?? t("tipArtist")}
    </ArtistButton>
  ) : (
    <Button
      className="tip-artist"
      type="button"
      onClick={onTipClick}
      startIcon={<FaDonate />}
    >
      {label ?? t("tipArtist")}
    </Button>
  );

  return (
    <>
      <TipArtistModal
        artist={artist}
        open={isTipPopUpOpen}
        onClose={() => setIsTipPopUpOpen(false)}
      >
        {hasNonDefaultTiers && (
          <>
            <div className="flex items-center w-full my-4 gap-4">
              <hr className="flex-grow border-(--mi-darken-x-background-color)" />
              {t("orSupportRegularly")}
              <hr className="flex-grow border-(--mi-darken-x-background-color)" />
            </div>
            <p className="mb-2">
              {t("likeWhatTheyAreDoing", { artistName: artist.name })}
            </p>
            <SupportArtistTiersForm artist={artist} excludeDefault={!!user} />
          </>
        )}

        <UnsubscribeButton artist={artist} />
      </TipArtistModal>
      {button}
    </>
  );
};

export default SupportArtist;
