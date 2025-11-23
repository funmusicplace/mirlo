import Button from "components/common/Button";
import React from "react";
import api from "services/api";

import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { FaDownload } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import useArtistQuery from "utils/useArtistQuery";

const ArtistSubscriberDataDownload: React.FC = () => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", {
    keyPrefix: "manageSubscriptions",
  });

  const [isLoadingSubscriberData, setIsLoadingSubscriberData] =
    React.useState(false);
  const { data: artist } = useArtistQuery();
  const { artistId } = useParams();

  const userId = user?.id;

  const downloadSubscriberData = React.useCallback(async () => {
    setIsLoadingSubscriberData(true);
    try {
      if (userId && artistId) {
        await api.getFile(
          "artist-subscribers",
          `manage/artists/${artistId}/subscribers?format=csv`,
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
    <li>
      <Button
        onClick={downloadSubscriberData}
        size="compact"
        startIcon={<FaDownload />}
        isLoading={isLoadingSubscriberData}
      >
        {t("downloadSubscriberData")}
      </Button>
    </li>
  );
};

export default ArtistSubscriberDataDownload;
