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

const TipArtist: React.FC<{ artistId: number }> = ({ artistId }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user } = useAuthContext();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: `${artistId}`, includeDefaultTier: true })
  );

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

  return (
    <>
      <Modal
        size="small"
        open={isTipPopUpOpen}
        onClose={() => setIsTipPopUpOpen(false)}
        title={t("tipThisArtist") ?? ""}
      >
        <p
          className={css`
            margin-bottom: 0.5rem;
          `}
        >
          {t("likeWhatTheyAreDoing")}
        </p>
        <SupportArtistTiersForm artist={artist} excludeDefault={!!user} />
        <TipArtistForm artist={artist} />
      </Modal>
      <Button
        compact
        transparent
        type="button"
        onClick={onTipClick}
        startIcon={<FaDonate />}
      >
        {t("tipArtist")}
      </Button>
    </>
  );
};

export default TipArtist;
