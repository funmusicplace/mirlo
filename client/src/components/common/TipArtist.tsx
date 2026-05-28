import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { queryArtist, queryUserStripeStatus } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaDonate } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import useGetArtistSubscriptionTiers from "utils/useGetArtistSubscriptionTiers";

import Button from "./Button";
import { FixedButton } from "./FixedButton";
import Modal from "./Modal";
import SupportArtistTiersForm from "./SupportArtistTiersForm";
import TipArtistForm from "./TipArtistForm";
import UnsubscribeButton from "./UnsubscribeButton";

const TipArtist: React.FC<{
  artistId: number;
  fixed?: boolean;
  compact?: boolean;
}> = ({ artistId, fixed = false, compact = false }) => {
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

  const onTipClick = React.useCallback(async () => {
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
      size="compact"
    >
      {t("tipArtist")}
    </FixedButton>
  ) : compact ? (
    <ArtistButton
      className={`tip-artist ${css`
        font-size: 0.75em !important;
        background-color: var(--mi-button-tint-color) !important;
      `}`}
      size="compact"
      variant="outlined"
      type="button"
      onClick={onTipClick}
      startIcon={<FaDonate />}
    >
      {t("tipArtist")}
    </ArtistButton>
  ) : (
    <Button
      className="tip-artist"
      type="button"
      onClick={onTipClick}
      startIcon={<FaDonate />}
    >
      {t("tipArtist")}
    </Button>
  );

  return (
    <>
      <Modal
        size="small"
        open={isTipPopUpOpen}
        onClose={() => setIsTipPopUpOpen(false)}
        title={t("tipThisArtist") ?? ""}
      >
        {hasNonDefaultTiers && (
          <>
            <p
              className={css`
                margin-bottom: 0.5rem;
                margin-top: 1rem;
              `}
            >
              {t("likeWhatTheyAreDoing", { artistName: artist.name })}
            </p>
            <SupportArtistTiersForm artist={artist} excludeDefault={!!user} />
          </>
        )}
        <div
          className={css`
            display: flex;
            justify-content: stretch;
            align-items: center;
            margin: 1rem 0;
            width: 100%;

            hr {
              flex-grow: 1;
              margin: 1rem;
              border-color: var(--mi-darken-x-background-color);
            }
          `}
        >
          <hr />
          {hasNonDefaultTiers ? t("orTipJustOnce") : t("tipThem")}
          <hr />
        </div>
        <TipArtistForm artist={artist} />

        <UnsubscribeButton artist={artist} />
      </Modal>
      {button}
    </>
  );
};

export default TipArtist;
