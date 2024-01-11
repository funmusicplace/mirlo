import Button from "components/common/Button";
import React from "react";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";

import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import { useParams } from "react-router-dom";
import { FaDownload } from "react-icons/fa";

const ArtistSubscriberDataDownload: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { t } = useTranslation("translation", {
    keyPrefix: "manageSubscriptions",
  });

  const [isLoadingSubscriberData, setIsLoadingSubscriberData] =
    React.useState(false);
  const {
    state: { artist },
  } = useArtistContext();
  const { artistId } = useParams();

  const userId = user?.id;

  const downloadSubscriberData = React.useCallback(async () => {
    setIsLoadingSubscriberData(true);
    try {
      if (userId && artistId) {
        await api.getFile(
          "artist-subscribers",
          `users/${userId}/artists/${artistId}/subscribers?format=csv`,
          "text/csv"
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSubscriberData(false);
    }
  }, [artistId, userId]);

  if (!artist) {
    return null;
  }

  return (
    <Button
      onClick={downloadSubscriberData}
      compact
      startIcon={<FaDownload />}
      isLoading={isLoadingSubscriberData}
    >
      {t("downloadSubscriberData")}
    </Button>
  );
};

export default ArtistSubscriberDataDownload;
