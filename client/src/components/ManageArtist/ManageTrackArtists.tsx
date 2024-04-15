import { css } from "@emotion/css";
import React from "react";
import { FaCheck, FaPen, FaPlus } from "react-icons/fa";
import TrackArtistFormFields from "./TrackArtistFormFields";
import Button from "components/common/Button";
import { useTranslation } from "react-i18next";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import Modal from "components/common/Modal";
import { useGlobalStateContext } from "state/GlobalState";
import api from "services/api";

export interface FormData {
  trackArtists: {
    artistName?: string;
    artistRole?: string;
    artistId?: number;
    trackId?: number;
  }[];
}

const ManageTrackArtists: React.FC<{
  disabled?: boolean;
  trackArtists: FormData["trackArtists"];
  onSave: () => void;
}> = ({ disabled, trackArtists, onSave }) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const [isOpen, setIsOpen] = React.useState(false);
  const methods = useForm<FormData>({
    defaultValues: {
      trackArtists,
    },
  });
  const { control, handleSubmit, reset } = methods;
  const {
    state: { user },
  } = useGlobalStateContext();
  const userId = user?.id;

  const { fields, append } = useFieldArray({
    control,
    name: `trackArtists`,
  });

  React.useEffect(() => {
    if (trackArtists) {
      reset({ trackArtists });
    }
  }, [reset, trackArtists]);

  const saveArtists = React.useCallback(
    async (formData: FormData) => {
      console.log("formData", formData);
      try {
        const packet = {
          trackArtists: formData.trackArtists
            .filter((a) => a.artistName || a.artistId)
            .map((a) => ({
              ...a,
              artistId:
                a.artistId && isFinite(+a.artistId) ? +a.artistId : undefined,
            })),
        };
        const trackId = formData.trackArtists[0].trackId;
        await api.put<Partial<Track>, { track: Track }>(
          `users/${userId}/tracks/${trackId}/trackArtists`,
          packet
        );
      } catch (e) {
        console.error(e);
      } finally {
        setIsOpen(false);
        onSave();
      }
    },
    [onSave, userId]
  );

  return (
    <FormProvider {...methods}>
      {fields
        .map(
          (field) => (field as unknown as { artistName: string })["artistName"]
        )
        .join(", ")}
      <Button
        variant="dashed"
        onClick={() => setIsOpen(true)}
        startIcon={<FaPen />}
        title={t("editTrackArtists") ?? ""}
      />
      <Modal
        title={t("trackArtists") ?? ""}
        onClose={() => setIsOpen(false)}
        open={isOpen}
      >
        <div
          className={css`
            display: flex;
            flex-direction: column;
          `}
        >
          <div>
            {fields.map((a, artistIndex) => (
              <TrackArtistFormFields
                artistIndex={artistIndex}
                key={a.id}
                disabled={disabled}
              />
            ))}
          </div>
          <div
            className={css`
              margin-top: 1rem;
              display: flex;
              justify-content: space-between;
              width: 100%;
              align-items: center;
            `}
          >
            <Button
              onClick={() => {
                append({ artistName: "" });
              }}
              type="button"
              compact
              disabled={disabled}
              startIcon={<FaPlus />}
              variant="dashed"
            >
              {t("addNewArtist")}
            </Button>
            <Button
              onClick={handleSubmit(saveArtists)}
              type="button"
              className={css`
                margin-left: 1rem;
              `}
              compact
              disabled={disabled}
              startIcon={<FaCheck />}
              variant="dashed"
            >
              {t("done")}
            </Button>
          </div>
        </div>
      </Modal>
    </FormProvider>
  );
};

export default ManageTrackArtists;
