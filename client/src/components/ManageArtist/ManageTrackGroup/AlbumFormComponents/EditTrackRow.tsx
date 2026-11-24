import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { Button } from "components/common/Button";
import FormCheckbox from "components/common/FormCheckbox";
import FormError from "components/common/FormError";
import { InputEl } from "components/common/Input";
import LoadingSpinner from "components/common/LoadingSpinner";
import Modal from "components/common/Modal";
import TextArea from "components/common/TextArea";
import { TrackData } from "components/ManageArtist/utils";
import { openOutsideLinkAfter } from "components/Merch/IncludesDigitalDownload";
import { queryManagedTrackGroup } from "queries";
import React from "react";
import { useFieldArray, useForm, FormProvider } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { FaPlus, FaQuestionCircle, FaSave, FaTimes } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { fmtMSS } from "utils/tracks";
import useJobStatusCheck from "utils/useJobStatusCheck";
import { useReleaseArtistName } from "utils/useReleaseArtistName";

import { bp } from "../../../../constants";
import SelectTrackPreview from "../../SelectTrackPreview";
import TrackUploadingState from "../../TrackUploadingState";
import ManageTrackLicense from "../ManageTrackLicense";
import TrackArtistFormFields from "../TrackArtistFormFields";

import ReplaceTrackAudioInput from "./ReplaceTrackAudioInput";
import ShowRawID3Data from "./ShowRawID3Data";

const ISWC_REGEX = /^T\d{10}$/i;

export interface FormData {
  title: string;
  status: "preview" | "must-own";
  trackFile: FileList;
  licenseId: number | null;
  isrc: string;
  iswc: string;
  lyrics: string;
  description: string;
  allowIndividualSale: boolean;
  minPrice: string;
  allowMirloPromo: boolean;
  trackArtists: TrackData["trackArtists"];
}

const IndentedTR = styled("tr")`
  border-left: 1rem solid var(--mi-text-color);
  border-bottom: 1px solid var(--mi-text-color);
  td {
    padding: 1rem 1rem 1rem 3rem;

    @media screen and (max-width: ${bp.medium}px) {
      padding-left: 1rem;
    }
  }
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 10rem minmax(0, 1fr);
  gap: 1rem;
  width: 100%;

  @media screen and (max-width: ${bp.medium}px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
  }
`;

const EditTrackRow: React.FC<{
  track: Track;
  onCancelEditing: () => void;
  reload: () => void;
}> = ({ track, onCancelEditing: cancelEditing, reload }) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTrackLicenseModalOpen, setIsTrackLicenseModalOpen] =
    React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });
  const { trackGroupId } = useParams();
  const { data: trackGroup } = useQuery(
    queryManagedTrackGroup(Number(trackGroupId))
  );
  const { releaseArtistName: formatReleaseArtistName } = useReleaseArtistName();
  const releaseArtistName = trackGroup
    ? formatReleaseArtistName(trackGroup)
    : "";
  const { uploadJobs, setUploadJobs } = useJobStatusCheck({
    reload: cancelEditing,
  });

  const methods = useForm<FormData>({
    defaultValues: {
      ...track,
      isrc: track.isrc ?? "",
      iswc: track.iswc ?? "",
      status: track.isPreview ? "preview" : "must-own",
      minPrice: `${track?.minPrice !== undefined ? track.minPrice / 100 : "0"}`,
    },
  });

  const { user } = useAuthContext();
  const userId = user?.id;
  const snackbar = useSnackbar();
  const trackId = track.id;
  const { control, register, reset, watch } = methods;
  const allowIndividualSale = watch("allowIndividualSale");
  const isrcValue = watch("isrc");
  const isrcWarning =
    !!isrcValue?.trim() &&
    !/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/.test(isrcValue.replace(/-/g, ""));
  const iswcValue = watch("iswc");
  const iswcWarning =
    !!iswcValue?.trim() && !ISWC_REGEX.test(iswcValue.replace(/[\s.-]/g, ""));
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
      isrc: track.isrc ?? "",
      iswc: track.iswc ?? "",
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
          iswc: formData.iswc,
          lyrics: formData.lyrics,
          description: formData.description,
          allowMirloPromo: formData.allowMirloPromo,
          isPreview: formData.status === "preview",
          allowIndividualSale: formData.allowIndividualSale,
          minPrice: formData.minPrice
            ? Number(formData.minPrice) * 100
            : undefined,
          licenseId: formData.licenseId ? Number(formData.licenseId) : null,
        };

        await api.put<Partial<Track>, { track: Track }>(
          `manage/tracks/${trackId}`,
          packet
        );

        if (!!formData.trackFile && formData.trackFile.length > 0) {
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
            vertical-align: top;
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
        <td
          className={css`
            width: 40%;
          `}
        >
          <InputEl
            {...register(`title`)}
            id={`${track.id}-title`}
            disabled={isSaving || isDisabled}
            aria-describedby={`${track.id}-title-info`}
          />
          <p id={`${track.id}-title-info`}>
            {t("originalFilename", {
              keyPrefix: "manageTrackTable",
              filename: track.audio?.originalFilename,
            })}
          </p>
        </td>
        <td>
          <SelectTrackPreview statusKey="status" />
        </td>
        <td align="right">
          <span className="inline-block leading-10">
            {track.audio?.duration && fmtMSS(+track.audio.duration)}
          </span>
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
                ? `background-color: var(--mi-button-color) !important;
                   color: var(--mi-button-text-color) !important;
                   border-color: var(--mi-button-color) !important;

                   animation: shake 0.5s;

                   svg {
                     fill: var(--mi-button-text-color) !important;
                   }`
                : ""}
            `}
          />
        </td>
      </tr>
      <IndentedTR>
        <td colSpan={99}>
          <FieldRow>
            <div>
              <span id={`label-listed-artists-${track.id}`}>
                {t("listedArtists", { keyPrefix: "manageTrackTable" })}
              </span>
            </div>
            <div
              role="group"
              aria-labelledby={`label-listed-artists-${track.id}`}
            >
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
                      releaseArtistName={releaseArtistName}
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
                      append({
                        artistName: "",
                        order: trackArtists.length,
                        appearsAs: "CREDITS_ONLY",
                      });
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
            </div>
          </FieldRow>
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={99}>
          <FieldRow>
            <div>
              <span id={`label-track-settings-${track.id}`}>
                {t("trackSettings")}
              </span>
            </div>
            <div>
              <div
                role="group"
                aria-labelledby={`label-track-settings-${track.id}`}
              >
                <FormCheckbox
                  idPrefix={`${track.id}-`}
                  keyName="allowIndividualSale"
                  description={t("allowSaleDescription")}
                />
                {allowIndividualSale && (
                  <div className="mt-2 mb-4">
                    <label htmlFor={`input-min-price-${track.id}`}>
                      {t("minPrice")}
                    </label>
                    <InputEl
                      id={`input-min-price-${track.id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      {...register("minPrice", { min: 0 })}
                    />
                  </div>
                )}
                <FormCheckbox
                  idPrefix={`${track.id}-`}
                  keyName="allowMirloPromo"
                  description={
                    <p>
                      <Trans
                        t={t}
                        i18nKey={"allowMirloPromoTrack"}
                        components={{
                          hype: (
                            <Link
                              className={openOutsideLinkAfter}
                              to="/team/posts/236/"
                              target="_blank"
                            ></Link>
                          ),
                        }}
                      />
                    </p>
                  }
                />
              </div>
            </div>
          </FieldRow>
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={99}>
          <FieldRow>
            <div>
              <label htmlFor={`input-lyrics-${track.id}`}>{t("lyrics")}</label>
            </div>
            <div>
              <TextArea
                id={`input-lyrics-${track.id}`}
                {...register("lyrics")}
                className={css`
                  width: 100%;
                `}
                rows={8}
              />
            </div>
          </FieldRow>
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={99}>
          <FieldRow>
            <div>
              <label htmlFor={`input-description-${track.id}`}>
                {t("description")}
              </label>
            </div>
            <div>
              <TextArea
                id={`input-description-${track.id}`}
                {...register("description")}
                className={css`
                  width: 100%;
                `}
                rows={8}
              />
            </div>
          </FieldRow>
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={99}>
          <FieldRow>
            <div>
              <div className="flex items-center gap-2">
                {t("license")}
                <Button
                  onClick={() => setIsTrackLicenseModalOpen(true)}
                  startIcon={<FaQuestionCircle />}
                />
                <Modal
                  onClose={() => setIsTrackLicenseModalOpen(false)}
                  open={isTrackLicenseModalOpen}
                >
                  <Trans
                    t={t}
                    i18nKey={"whatMeanLicense"}
                    components={{ a: <a></a> }}
                  />
                </Modal>
              </div>
            </div>
            <div>
              <ManageTrackLicense />
            </div>
          </FieldRow>
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={99}>
          <FieldRow>
            <div>{t("identifiers")}</div>
            <div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor={`input-isrc-${track.id}`}>
                    {t("isrcCode")}
                  </label>
                  <InputEl
                    id={`input-isrc-${track.id}`}
                    aria-describedby={`hint-isrc-${track.id}${isrcWarning ? ` error-isrc-${track.id}` : ""}`}
                    {...register("isrc")}
                    disabled={isSaving || isDisabled}
                  />
                  <small id={`hint-isrc-${track.id}`}>{t("isrcHint")}</small>
                  {isrcWarning && (
                    <FormError id={`error-isrc-${track.id}`}>
                      {t("isrcInvalid")}
                    </FormError>
                  )}
                </div>
                <div>
                  <label htmlFor={`input-iswc-${track.id}`}>
                    {t("iswcCode")}
                  </label>
                  <InputEl
                    id={`input-iswc-${track.id}`}
                    aria-describedby={`hint-iswc-${track.id}${iswcWarning ? ` error-iswc-${track.id}` : ""}`}
                    {...register("iswc")}
                    disabled={isSaving || isDisabled}
                  />
                  <small id={`hint-iswc-${track.id}`}>{t("iswcHint")}</small>
                  {iswcWarning && (
                    <FormError id={`error-iswc-${track.id}`}>
                      {t("iswcInvalid")}
                    </FormError>
                  )}
                </div>
              </div>
            </div>
          </FieldRow>
        </td>
      </IndentedTR>
      <IndentedTR>
        <td colSpan={99}>
          <FieldRow>
            <div>{t("id3Data")}</div>
            <div>
              <ShowRawID3Data track={track} />
            </div>
          </FieldRow>
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
                ? `background-color: var(--mi-button-color) !important;
                   color: var(--mi-button-text-color) !important;
                   border-color: var(--mi-button-color) !important;`
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
