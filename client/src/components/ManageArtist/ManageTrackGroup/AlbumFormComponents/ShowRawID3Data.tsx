import { ArtistButton } from "components/Artist/ArtistButtons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

const ShowRawID3Data: React.FC<{ track: Track }> = ({ track }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div>
      <ArtistButton
        onClick={toggleVisibility}
        variant="outlined"
        size="compact"
      >
        {isVisible ? t("hideRawId3Data") : t("showRawId3Data")}
      </ArtistButton>
      {isVisible && (
        <div>
          {/* Raw ID3 data will be displayed here */}
          <code>{JSON.stringify(track.metadata, null, 2)}</code>
        </div>
      )}
    </div>
  );
};

export default ShowRawID3Data;
