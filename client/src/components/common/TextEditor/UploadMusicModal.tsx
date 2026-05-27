import { css } from "@emotion/css";
import BulkTrackUpload from "components/ManageArtist/ManageTrackGroup/BulkTrackUpload";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import api from "services/api";
import useErrorHandler from "services/useErrorHandler";

import Box from "../Box";
import Button from "../Button";
import FormComponent from "../FormComponent";
import { InputEl } from "../Input";
import Modal from "../Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  artistId?: number;
  onTrackReady: (trackId: number) => void;
};

const UploadMusicModal: React.FC<Props> = ({
  open,
  onClose,
  artistId,
  onTrackReady,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "textEditor" });
  const errorHandler = useErrorHandler();
  const [draftAlbum, setDraftAlbum] = React.useState<TrackGroup>();
  const [newSongs, setNewSongs] = React.useState<Track[]>([]);
  const methods = useForm<{ titles: string[] }>();
  const titles = methods.watch("titles");

  const loadDraft = React.useCallback(async () => {
    if (!artistId) return;
    const response = await api.get<TrackGroup>(
      `manage/artists/${artistId}/drafts`
    );
    setDraftAlbum(response.result);
  }, [artistId]);

  React.useEffect(() => {
    if (open) {
      loadDraft().catch((e) => errorHandler(e, true));
    } else {
      methods.reset({ titles: [] });
      setNewSongs([]);
    }
  }, [open, loadDraft, errorHandler, methods]);

  const onNewTrackUploaded = React.useCallback(
    async (newTrack?: Track) => {
      if (!newTrack) return;
      try {
        const { result } = await api.get<Track>(`manage/tracks/${newTrack.id}`);
        setNewSongs((existing) => [...existing, result]);
        loadDraft();
      } catch (e) {
        errorHandler(e, true);
      }
    },
    [loadDraft, errorHandler]
  );

  const addTracks = React.useCallback(async () => {
    const formTitles = methods.getValues("titles");
    try {
      await Promise.all(
        newSongs.map(async (song, idx) => {
          await api.put(`manage/tracks/${song.id}`, {
            title: formTitles[idx],
          });
        })
      );
      newSongs.forEach((song) => onTrackReady(song.id));
      onClose();
    } catch (e) {
      errorHandler(e, true);
    }
  }, [newSongs, methods, onTrackReady, onClose, errorHandler]);

  const hasEmptyTitle = titles?.some((title) => title === "");

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="medium"
      title={t("uploadNewSong")}
    >
      <p>{t("uploadNewSongDescription")}</p>
      {!draftAlbum && <p>{t("uploadUnavailable")}</p>}
      {draftAlbum && (
        <>
          {newSongs.length > 0 && (
            <div
              className={css`
                display: flex;
                flex-direction: column;

                > div {
                  padding: 1rem;
                  font-weight: bold;
                  border: 1px dashed var(--mi-darken-xx-background-color);
                  margin-top: 1rem;
                }

                button {
                  margin-top: 1rem;
                }
              `}
            >
              {newSongs.map((song, idx) => (
                <FormComponent key={song.id}>
                  <label htmlFor={`input-song-title-${idx}`}>
                    {t("songTitle")}
                  </label>
                  <InputEl
                    id={`input-song-title-${idx}`}
                    {...methods.register(`titles.${idx}`)}
                    required
                  />
                  <small>{song.audio?.originalFilename}</small>
                </FormComponent>
              ))}
              {hasEmptyTitle && (
                <Box variant="warning">{t("addTitleToUpload")}</Box>
              )}
              <Button disabled={!!hasEmptyTitle} onClick={addTracks}>
                {t("addThisSong")}
              </Button>
            </div>
          )}
          <BulkTrackUpload
            trackgroup={draftAlbum}
            reload={onNewTrackUploaded}
          />
        </>
      )}
    </Modal>
  );
};

export default UploadMusicModal;
