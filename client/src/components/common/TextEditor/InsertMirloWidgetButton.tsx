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
import BulkTrackUpload from "components/ManageArtist/BulkTrackUpload";
import { InputEl } from "../Input";
import FormComponent from "../FormComponent";
import Box from "../Box";

const InsertMirloWidgetButton: React.FC<{
  postId: number;
  artistId: number;
}> = ({ postId, artistId }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [draftAlbum, setDraftAlbum] = React.useState<TrackGroup>();
  const [newSong, setNewSong] = React.useState<Track>();
  const [newSongTitle, setNewSongTitle] = React.useState("");
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

  const addNewSong = React.useCallback(async () => {
    if (newSong) {
      try {
        await api.put(`manage/tracks/${newSong.id}`, { title: newSongTitle });
        onAdd(newSong.id, "track");
      } catch (e) {
        console.error(e);
      }
    }
  }, [newSong, newSongTitle]);

  const setNewSongDetails = React.useCallback(async (newTrack?: Track) => {
    if (newTrack) {
      try {
        const { result } = await api.get<Track>(`manage/tracks/${newTrack.id}`);
        setNewSong(result);
        setNewSongTitle(result?.title ?? "");
        loadDraft();
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const loadDraft = React.useCallback(async () => {
    const response = await api.get<TrackGroup>(
      `manage/artists/${artistId}/drafts`
    );
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
                  display: flex;

                  > div {
                    padding: 1rem;
                    font-weight: bold;
                    border: 1px dashed var(--mi-darken-xx-background-color);
                    display: blox;
                    margin-top: 1rem;
                  }

                  button {
                    margin-top: 1rem;
                  }
                `}
              >
                <FormComponent>
                  <label>{t("songTitle")}</label>
                  <InputEl
                    value={newSongTitle}
                    onChange={(e) => setNewSongTitle(e.currentTarget.value)}
                  />
                  <small>{newSong.audio?.originalFilename}</small>
                </FormComponent>
                {newSongTitle === "" && (
                  <Box variant="warning">{t("addTitleToUpload")}</Box>
                )}
                <Button disabled={newSongTitle === ""} onClick={addNewSong}>
                  {t("addThisSong")}
                </Button>
              </div>
            )}
            {!newSong && (
              <BulkTrackUpload
                trackgroup={draftAlbum}
                reload={setNewSongDetails}
              />
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default InsertMirloWidgetButton;
