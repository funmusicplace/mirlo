import React from "react";
import { useFieldArray, useForm, FormProvider } from "react-hook-form";
import { InputEl } from "components/common/Input";
import { FaPlus, FaSave, FaTimes } from "react-icons/fa";
import { css } from "@emotion/css";
import { Trans, useTranslation } from "react-i18next";
import { fmtMSS } from "utils/tracks";
import SelectTrackPreview from "../../SelectTrackPreview";
import TrackUploadingState from "../../TrackUploadingState";
import TrackArtistFormFields from "../TrackArtistFormFields";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";
import useJobStatusCheck from "utils/useJobStatusCheck";
import LoadingSpinner from "components/common/LoadingSpinner";
import { useAuthContext } from "state/AuthContext";
import ManageTrackLicense from "../ManageTrackLicense";
import ReplaceTrackAudioInput from "./ReplaceTrackAudioInput";
import TextArea from "components/common/TextArea";
import { Link, useParams } from "react-router-dom";
import { queryArtist } from "queries";
import { useQuery } from "@tanstack/react-query";
import ShowRawID3Data from "./ShowRawID3Data";
import styled from "@emotion/styled";
import FormCheckbox from "components/common/FormCheckbox";
import InfoModal from "components/common/InfoModal";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { TrackData } from "components/ManageArtist/utils";

export interface FormData {
  title: string;
  status: "preview" | "must-own";
  trackFile: FileList;
  licenseId: number;
  isrc: string;
  lyrics: string;
  description: string;
  allowIndividualSale: boolean;
  minPrice: string;
  allowMirloPromo: boolean;
  trackArtists: TrackData["trackArtists"];
}

const IndentedTR = styled("tr")`
  border-left: 1rem solid white;

  td:first-child {
    padding-left: 3rem;
  }
`;

const EditTrackRow: React.FC<{
  track: Track;
  onCancelEditing: () => void;
  reload: () => void;
}> = ({ track, onCancelEditing: cancelEditing, reload }) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { uploadJobs, setUploadJobs } = useJobStatusCheck({
    reload: cancelEditing,
  });

  const { artistId } = useParams();

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const colors = artist?.properties?.colors;

  const methods = useForm<FormData>({
    defaultValues: {
      title: track.title,
      trackArtists: track.trackArtists,
      status: track.isPreview ? "preview" : "must-own",
      licenseId: track.licenseId,
      lyrics: track.lyrics,
      allowMirloPromo: track.allowMirloPromo,
      description: track.description,
      isrc: track.isrc,
      minPrice: `${track?.minPrice !== undefined ? track.minPrice / 100 : "0"}`,
      allowIndividualSale: track.allowIndividualSale,
    },
  });

  const { user } = useAuthContext();
  const userId = user?.id;
  const snackbar = useSnackbar();
  const trackId = track.id;
  const { control, register, reset, watch } = methods;
  const allowIndividualSale = watch("allowIndividualSale");
  const {
    fields: trackArtists,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "trackArtists",
  });

  const onCancelEditing = React.useCallback(() => {
    reset({
      title: track.title,
      trackArtists: track.trackArtists,
      status: track.isPreview ? "preview" : "must-own",
      licenseId: track.licenseId,
      isrc: track.isrc,
      allowMirloPromo: track.allowMirloPromo,
      lyrics: track.lyrics,
      description: track.description,
      minPrice: `${track?.minPrice !== undefined ? track.minPrice / 100 : "0"}`,
      allowIndividualSale: track.allowIndividualSale,
    });
    cancelEditing();
  }, [reset, track, cancelEditing]);

  const onSave = React.useCallback(
    async (formData: FormData) => {
      try {
        setIsSaving(true);
        const packet = {
          title: formData.title,
          trackArtists: formData.trackArtists,
          isrc: formData.isrc,
          lyrics: formData.lyrics,
          description: formData.description,
          allowMirloPromo: formData.allowMirloPromo,
          isPreview: formData.status === "preview",
          allowIndividualSale: formData.allowIndividualSale,
          minPrice: formData.minPrice
            ? Number(formData.minPrice) * 100
            : undefined,
          licenseId: formData.licenseId
            ? Number(formData.licenseId)
            : undefined,
        };

        await api.put<Partial<Track>, { track: Track }>(
          `manage/tracks/${trackId}`,
          packet
        );

        if (formData.trackFile.length > 0) {
          const jobInfo = await api.uploadFile(
            `manage/tracks/${trackId}/audio`,
            [formData.trackFile[0]]
          );
          const jobId = jobInfo.result.jobId;
          setUploadJobs([{ jobId, jobStatus: "waiting" }]);
        } else {
          onCancelEditing();
        }
        snackbar(t("updatedTrack"), { type: "success" });
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
        reload();
      }
    },
    [onCancelEditing, reload, setUploadJobs, snackbar, t, trackId, userId]
  );

  const uploadingState = uploadJobs?.[0]?.jobStatus;
  let isDisabled = !!(uploadingState || uploadJobs.length > 0);

  return (
    <FormProvider {...methods}>
      <tr
        className={css`
          td {
            padding-bottom: 1.5rem !important;
          }
          ${isDisabled || isSaving
            ? `
            opacity: .4;
            pointer-events: none;
            `
            : ""}
        `}
      >
        <td>
          {isSaving && <LoadingSpinner />}

          {!uploadingState && !isSaving && (
            <ReplaceTrackAudioInput
              trackId={trackId}
              isDisabled={isDisabled}
              reload={reload}
            />
          )}
          {!isSaving && <TrackUploadingState uploadingState={uploadingState} />}
        </td>
        <td>
          <InputEl {...register(`title`)} disabled={isSaving || isDisabled} />
        </td>
        <td>
          <SelectTrackPreview statusKey="status" />
        </td>
        <td align="right">
          {track.audio?.duration && fmtMSS(+track.audio.duration)}
        </td>
        <td
          align="right"
          className={css`
            button {
              display: inline-block;
              margin-left: 0.25rem;
            }
          `}
        >
          <ArtistButton
            size="compact"
            onClick={onCancelEditing}
            type="button"
            title="Close"
            variant="dashed"
            startIcon={<FaTimes />}
            disabled={isSaving || isDisabled}
          />
          <ArtistButton
            size="compact"
            variant="dashed"
            startIcon={<FaSave />}
            disabled={isSaving || isDisabled}
            onClick={methods.handleSubmit(onSave)}
            type="button"
            className={css`
              ${methods.formState.isDirty
                ? `background-color: ${colors?.primary} !important; 
                   color: ${colors?.background} !important;
                   border-color: ${colors?.primary} !important;`
                : ""}
            `}
          />
        </td>
      </tr>
      <IndentedTR>
        <td colSpan={2}>
          <label htmlFor="listedArtists">
            {t("listedArtists", { keyPrefix: "manageTrackTable" })}
          </label>
        </td>
        <td colSpan={99}>
          <div
            className={css`
              display: flex;
              flex-direction: column;
            `}
          >
            <div>
              {trackArtists.map((a, artistIndex) => (
                <TrackArtistFormFields
                  artistIndex={artistIndex}
                  key={a.id}
                  disabled={isDisabled}
                  onRemove={remove}
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
              <ArtistButton
                onClick={() => {
                  append({ artistName: "" });
                }}
                type="button"
                size="compact"
                disabled={isDisabled}
                startIcon={<FaPlus />}
                variant="dashed"
              >
                {t("addNewArtist")}
              </ArtistButton>
            </div>
          </div>
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={2}>
          <label htmlFor="allowIndividualSale">
            {t("allowIndividualSale")}
          </label>
        </td>
        <td colSpan={99}>
          <FormCheckbox
            keyName="allowIndividualSale"
            description={t("allowSaleDescription")}
          />
        </td>
      </IndentedTR>
      {allowIndividualSale && (
        <IndentedTR>
          <td colSpan={2}>
            <label htmlFor="minPrice">{t("minPrice")}</label>
          </td>
          <td colSpan={99}>
            <InputEl id="minPrice" {...register("minPrice")} />
          </td>
        </IndentedTR>
      )}
      <IndentedTR>
        <td colSpan={2}>
          <label htmlFor={`${track.id}-allowMirloPromo`}>
            {t("allowMirloPromoLabel")}
          </label>
        </td>
        <td colSpan={99}>
          <FormCheckbox
            idPrefix={`${track.id}-`}
            keyName="allowMirloPromo"
            description={
              <p>
                <Trans
                  t={t}
                  i18nKey={"allowMirloPromo"}
                  components={{
                    hype: <Link to="/team/posts/236/"></Link>,
                  }}
                />
              </p>
            }
          />
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={2}>
          <label htmlFor="isrc">{t("isrcCode")}</label>
        </td>
        <td colSpan={99}>
          <InputEl
            id="isrc"
            {...register(`isrc`)}
            disabled={isSaving || isDisabled}
          />
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={2}>
          <label htmlFor="lyrics">{t("lyrics")}</label>
        </td>
        <td colSpan={99}>
          <TextArea
            id="lyrics"
            {...register("lyrics")}
            className={css`
              width: 100%;
            `}
            rows={8}
          />
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={2}>
          <label htmlFor="description">{t("description")}</label>
        </td>
        <td colSpan={99}>
          <TextArea
            id="description"
            {...register("description")}
            className={css`
              width: 100%;
            `}
            rows={8}
          />
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={2}>
          <div
            className={css`
              display: flex;
              align-items: center;
            `}
          >
            {t("license")}
            <InfoModal
              info={
                <Trans
                  t={t}
                  i18nKey={"whatMeanLicense"}
                  components={{ a: <a></a> }}
                />
              }
            />
          </div>
        </td>
        <td colSpan={99}>
          <ManageTrackLicense />
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={2}>id3Tags</td>
        <td colSpan={99}>
          <ShowRawID3Data track={track} />
        </td>
      </IndentedTR>
      <IndentedTR>
        <td
          colSpan={99}
          className={css`
            padding-bottom: 2rem !important;
            white-space: nowrap;
            button {
              margin-right: 0.5rem;
              float: right;
            }
          `}
        >
          <ArtistButton
            size="compact"
            startIcon={<FaSave />}
            disabled={isSaving || isDisabled}
            onClick={methods.handleSubmit(onSave)}
            type="button"
            className={css`
              ${methods.formState.isDirty
                ? `background-color: ${colors?.primary} !important; 
                   color: ${colors?.background} !important;
                   border-color: ${colors?.primary} !important;`
                : ""}
            `}
          >
            {t("saveTrack")}
          </ArtistButton>
          <ArtistButton
            size="compact"
            onClick={onCancelEditing}
            type="button"
            title="Close"
            variant="dashed"
            startIcon={<FaTimes />}
            disabled={isSaving || isDisabled}
          >
            {t("cancelChanges")}
          </ArtistButton>
        </td>
      </IndentedTR>
    </FormProvider>
  );
};

export default EditTrackRow;
