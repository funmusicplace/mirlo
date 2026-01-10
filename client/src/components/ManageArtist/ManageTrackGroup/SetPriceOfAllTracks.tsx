import { css } from "@emotion/css";
import {
  ArtistButton,
  useGetArtistColors,
} from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

interface BulkUpdateTracksProps {
  tracks: Track[];
  reload: () => void;
}

const SetPriceOfAllTracks: React.FC<BulkUpdateTracksProps> = ({
  reload,
  tracks,
}) => {
  const { colors } = useGetArtistColors();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();
  const [minPrice, setMinPrice] = useState<number>();

  const handleBulkUpdate = async (allowIndividualSale: boolean) => {
    try {
      await Promise.all(
        tracks.map((track) => {
          return api.put(`manage/tracks/${track.id}`, {
            minPrice:
              minPrice && allowIndividualSale ? minPrice * 100 : undefined,
            allowIndividualSale,
          });
        })
      );
      await api.put(`manage/trackGroups/${tracks[0].trackGroupId}`, {
        defaultTrackAllowIndividualSale: allowIndividualSale,
        defaultTrackMinPrice:
          minPrice && allowIndividualSale ? minPrice * 100 : undefined,
      });
      // If individual sale is not allowed, clear minPrice state
      if (!allowIndividualSale) {
        setMinPrice(undefined);
      }
      snackbar(t("updatedAllTracks"), { type: "success" });
      reload();
    } catch (error) {
      console.error("Error updating tracks:", error);
    }
  };

  return (
    <div
      className={css`
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: flex-end;
        padding: 1rem 0;

        input {
          margin-bottom: 0 !important;
        }

        > div {
          margin-bottom: 0 !important;
        }
      `}
    >
      <FormComponent>
        <label htmlFor="minPriceOnTracks">{t("minPriceOnTracks")}</label>

        <InputEl
          id="minPriceOnTracks"
          colors={colors}
          type="number"
          value={minPrice}
          className={css`
            width: 100px;
          `}
          onChange={(e) => setMinPrice(Number(e.target.value))}
        />
      </FormComponent>
      <ArtistButton onClick={() => handleBulkUpdate(true)}>
        {t("setPriceOfAllTracks")}
      </ArtistButton>
      <ArtistButton variant="dashed" onClick={() => handleBulkUpdate(false)}>
        {t("dontAllowIndividualSale")}
      </ArtistButton>
    </div>
  );
};

export default SetPriceOfAllTracks;
