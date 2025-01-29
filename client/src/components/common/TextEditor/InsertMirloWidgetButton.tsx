import React from "react";
import Button from "../Button";
import Modal from "../Modal";
import { FaMusic } from "react-icons/fa";
import { useCommands } from "@remirror/react";
import AutoComplete from "../AutoComplete";
import api from "services/api";
import { widgetUrl } from "utils/tracks";
import { css } from "@emotion/css";
import { bp } from "../../../constants";
import AutoCompleteTrackGroup from "../AutoCompleteTrackGroup";
import { useTranslation } from "react-i18next";
import Tabs from "../Tabs";
import BulkTrackUpload from "components/ManageArtist/BulkTrackUpload";

const InsertMirloWidgetButton: React.FC<{
  postId: number;
  artistId: number;
}> = ({ postId, artistId }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftAlbum, setDraftAlbum] = React.useState<TrackGroup>();
  const [newSong, setNewSong] = React.useState<Track>();
  const { addIframe } = useCommands();
  const { t } = useTranslation("translation", { keyPrefix: "textEditor" });

  const onAdd = async (
    trackId: string | number,
    variant: "track" | "trackGroup"
  ) => {
    addIframe({
      src: widgetUrl(+trackId, variant),
      height: variant === "track" ? 137 : 371,
      width: 700,
    });
    if (variant) {
      await api.put(`manage/posts/${postId}/tracks`, {
        trackId: trackId,
      });
    }
    setIsOpen(false);
  };

  const getTrackOptions = React.useCallback(async (searchString: string) => {
    const results = await api.getMany<Track>(`tracks`, {
      title: searchString,
      take: "10",
    });
    return results.results.map((r) => ({
      name: `${r.trackGroup.artist?.name} - ${r.title}`,
      id: r.id,
    }));
  }, []);

  const loadDraft = React.useCallback(async () => {
    const response = await api.get<TrackGroup>(
      `manage/artists/${artistId}/drafts`
    );
    console.log("response", response);
    setDraftAlbum(response.result);
  }, []);

  React.useEffect(() => {
    try {
      loadDraft();
    } catch (e) {}
  }, []);

  return (
    <>
      <Button
        startIcon={<FaMusic />}
        type="button"
        onClick={() => setIsOpen(true)}
      />
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size="small"
        title="Add some music"
        contentClassName={css`
          min-height: 160px;
          overflow: inherit;

          input + div + div {
            z-index: 1000;
            position: fixed;
            width: calc(92% - 1rem);
          }

          input {
            position: relative;
            z-index: 999;
          }

          @media screen and (max-width: ${bp.small}px) {
            input + div + div {
              width: 90%;
              margin-right: 1rem;
              margin-left: 1rem;
            }
          }

          ul {
            margin-bottom: 1rem;
          }
        `}
      >
        {draftAlbum && (
          <>
            <div
              className={css`
                margin-bottom: 2rem;
              `}
            >
              <h2>{t("useExistingSong")}</h2>
              <p>{t("existingSongDescription")}</p>

              {t("insertATrack")}
              <AutoComplete
                getOptions={getTrackOptions}
                onSelect={(val) => {
                  onAdd(val, "track");
                }}
              />
              <br />
              {t("insertATrackGroup")}
              <AutoCompleteTrackGroup
                onSelect={(val) => onAdd(val, "trackGroup")}
              />
            </div>
            <h2>{t("uploadNewSong")}</h2>
            <p>{t("uploadNewSongDescription")}</p>
            {newSong && (
              <div
                className={css`
                  flex-direction: column;

                  button {
                    margin-top: 1rem;
                  }
                `}
              >
                {newSong.title}
                <Button
                  onClick={() => {
                    onAdd(newSong.id, "track");
                  }}
                >
                  {t("")}
                </Button>
              </div>
            )}
            {!newSong && (
              <BulkTrackUpload
                trackgroup={draftAlbum}
                reload={async (newTrack) => {
                  setNewSong(newTrack);
                  loadDraft();
                }}
              />
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default InsertMirloWidgetButton;
