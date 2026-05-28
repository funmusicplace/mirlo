import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import ReleaseListSelector from "components/common/ReleaseListSelector";
import { queryManagedArtist } from "queries";
import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaPlus, FaTimes } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useSnackbar } from "state/SnackbarContext";

type FormData = {
  group: string;
  quantity: string;
};

const GenerateAlbumDownloadCodes: React.FC<{ onDone: () => void }> = ({
  onDone,
}) => {
  const methods = useForm<FormData>();
  const { artistId } = useParams();
  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));
  const snackbar = useSnackbar();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedTrackGroupId, setSelectedTrackGroupId] = React.useState<
    number | null
  >(null);
  const { t } = useTranslation("translation", {
    keyPrefix: "manageArtistTools",
  });

  const generateDownloadCodes = React.useCallback(
    async (data: FormData) => {
      if (selectedTrackGroupId) {
        try {
          await api.post(`manage/trackGroups/${selectedTrackGroupId}/codes`, [
            {
              group: data.group,
              quantity: data.quantity,
            },
          ]);
          methods.reset();
          setSelectedTrackGroupId(null);
          snackbar(t("success"), { type: "success" });
          setIsOpen(false);
          onDone();
        } catch (e) {
          console.error(e);
        }
      }
    },
    [methods, onDone, snackbar, selectedTrackGroupId, t]
  );

  if (!artistId) return null;

  if (!isOpen) {
    return (
      <ArtistButton
        variant="dashed"
        onClick={() => setIsOpen(true)}
        startIcon={<FaPlus />}
        size="compact"
      >
        {t("addDownloadCodes")}
      </ArtistButton>
    );
  }

  return (
    <div className="flex flex-col gap-4 border border-(--mi-tint-color) rounded p-4 bg-(--mi-button-tint-color)">
      <div className="flex items-center justify-between">
        <h3 className="m-0!">{t("generateDownloadCodes")}</h3>
        <ArtistButton
          variant="dashed"
          size="compact"
          startIcon={<FaTimes />}
          onClick={() => {
            setIsOpen(false);
            setSelectedTrackGroupId(null);
            methods.reset();
          }}
          aria-label={t("cancel")}
        />
      </div>

      <div role="group" aria-labelledby="chooseAnAlbumLabel">
        <p id="chooseAnAlbumLabel" className="block mb-2 text-sm font-semibold">
          {t("chooseAnAlbum")}
        </p>
        <ReleaseListSelector
          artistId={Number(artistId)}
          single
          selectedReleaseIds={
            selectedTrackGroupId ? [selectedTrackGroupId] : []
          }
          onSelectChange={(ids) => setSelectedTrackGroupId(ids[0] ?? null)}
          maxHeight="240px"
          includeLabelReleases={!!artist?.isLabelProfile}
        />
      </div>

      {selectedTrackGroupId && (
        <>
          <FormComponent>
            <label htmlFor="input-group">{t("groupName")}</label>
            <InputEl id="input-group" {...methods.register("group")} required />
          </FormComponent>
          <FormComponent>
            <label htmlFor="input-quantity">{t("quantity")}</label>
            <InputEl
              id="input-quantity"
              type="number"
              {...methods.register("quantity")}
              defaultValue={100}
              required
            />
          </FormComponent>
          <ArtistButton
            onClick={methods.handleSubmit(generateDownloadCodes)}
            startIcon={<FaPlus />}
          >
            {t("generate")}
          </ArtistButton>
        </>
      )}
    </div>
  );
};

export default GenerateAlbumDownloadCodes;
