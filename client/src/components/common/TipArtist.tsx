import React from "react";
import Button from "./Button";
import api from "services/api";
import { FaCheck, FaDonate, FaMinus, FaPlus } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";

import { useAuthContext } from "state/AuthContext";
import SupportArtistTiersForm from "./SupportArtistTiersForm";
import { useQuery } from "@tanstack/react-query";
import { queryArtist } from "queries";
import { css } from "@emotion/css";
import Box from "./Box";
import TipArtistForm from "./TipArtistForm";

const TipArtist: React.FC<{ artistId: number }> = ({ artistId }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { user, refreshLoggedInUser } = useAuthContext();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: `${artistId}`, includeDefaultTier: true })
  );

  const localArtistId = artistId ?? artist?.id;

  const [isTipPopUpOpen, setIsTipPopUpOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const onTipClick = React.useCallback(async () => {
    setIsTipPopUpOpen(true);
  }, []);

  const onTipArtist = React.useCallback(async () => {
    try {
      if (user) {
        await api.post(`artists/${localArtistId}/tip`, {
          email: user.email,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [localArtistId, refreshLoggedInUser, user]);

  if (!artist) {
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
        isLoading={isLoading}
        startIcon={<FaDonate />}
      >
        {t("tipArtist")}
      </Button>
    </>
  );
};

export default TipArtist;
