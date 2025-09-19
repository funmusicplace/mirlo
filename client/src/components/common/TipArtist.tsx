import React from "react";
import Button from "./Button";
import { FaDonate } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";

import { useAuthContext } from "state/AuthContext";
import SupportArtistTiersForm from "./SupportArtistTiersForm";
import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryUserStripeStatus } from "queries";
import { css } from "@emotion/css";
import TipArtistForm from "./TipArtistForm";
import { FixedButton } from "./FixedButton";
import UnsubscribeButton from "./UnsubscribeButton";
import useGetArtistSubscriptionTiers from "utils/useGetArtistSubscriptionTiers";

const TipArtist: React.FC<{ artistId: number; fixed?: boolean }> = ({
  artistId,
  fixed = false,
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
        <p
          className={css`
            margin-bottom: 0.5rem;
            margin-top: 1rem;
          `}
        >
          {hasNonDefaultTiers ? t("orTipJustOnce") : t("tipThem")}
        </p>
        <TipArtistForm artist={artist} />

        <UnsubscribeButton artist={artist} />
      </Modal>
      {button}
    </>
  );
};

export default TipArtist;
