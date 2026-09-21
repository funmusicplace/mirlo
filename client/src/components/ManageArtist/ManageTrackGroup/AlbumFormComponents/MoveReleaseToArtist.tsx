import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { SelectEl } from "components/common/Select";
import { queryManagedArtists } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistManageUrl } from "utils/artist";

const MoveReleaseToArtist: React.FC<{
  trackGroup: TrackGroup;
  artist: Artist;
}> = ({ trackGroup, artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const [isMoving, setIsMoving] = React.useState(false);
  const [chosenArtistId, setChosenArtistId] = React.useState("");

  const { data: managedArtists } = useQuery(queryManagedArtists());

  const otherArtists = (managedArtists?.results ?? []).filter(
    (managed) => managed.id !== artist.id
  );

  const doMove = React.useCallback(async () => {
    const moveToArtistId = Number(chosenArtistId);

    if (!moveToArtistId) {
      return;
    }

    const destination = otherArtists.find((a) => a.id === moveToArtistId);
    const confirmed = window.confirm(
      t("confirmMoveRelease", { artistName: destination?.name ?? "" }) ?? ""
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsMoving(true);
      await api.put(`manage/trackGroups/${trackGroup.id}`, {
        moveToArtistId,
      });
      snackbar(t("releaseMoved"), { type: "success" });
      navigate(`${getArtistManageUrl(moveToArtistId)}/releases`);
    } catch (e) {
      console.error(e);
      snackbar(t("releaseMoveFailed"), { type: "warning" });
    } finally {
      setIsMoving(false);
    }
  }, [chosenArtistId, otherArtists, trackGroup.id, navigate, snackbar, t]);

  if (otherArtists.length === 0) {
    return null;
  }

  return (
    <FormComponent>
      <label htmlFor="select-move-release">{t("moveReleaseToArtist")}</label>
      <small className="block mb-2">{t("moveReleaseToArtistHint")}</small>
      <div className="flex flex-wrap gap-2 items-center">
        <SelectEl
          id="select-move-release"
          className="w-auto!"
          value={chosenArtistId}
          onChange={(e) => setChosenArtistId(e.target.value)}
        >
          <option value="">{t("chooseAnArtist")}</option>
          {otherArtists.map((other) => (
            <option value={other.id} key={other.id}>
              {other.name}
            </option>
          ))}
        </SelectEl>
        <ArtistButton
          type="button"
          variant="outlined"
          disabled={!chosenArtistId}
          isLoading={isMoving}
          onClick={doMove}
        >
          {t("moveRelease")}
        </ArtistButton>
      </div>
    </FormComponent>
  );
};

export default MoveReleaseToArtist;
