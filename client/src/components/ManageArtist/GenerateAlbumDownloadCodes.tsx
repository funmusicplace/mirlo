import React from "react";

import Modal from "components/common/Modal";
import { useTranslation } from "react-i18next";
import Button from "components/common/Button";
import { FaPlus, FaTimes } from "react-icons/fa";
import AutoComplete from "components/common/AutoComplete";
import api from "services/api";
import { css } from "@emotion/css";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import SmallTileDetails from "components/common/SmallTileDetails";
import { InputEl } from "components/common/Input";
import FormComponent from "components/common/FormComponent";
import { useForm } from "react-hook-form";
import { useSnackbar } from "state/SnackbarContext";
import { queryManagedArtist } from "queries";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

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
  const [selectedTrackGroup, setSelectedTrackGroup] =
    React.useState<TrackGroup>();
  const { t } = useTranslation("translation", {
    keyPrefix: "manageArtistTools",
  });

  const onChooseAlbum = async (trackGroupId: string | number) => {
    const trackGroup = await api.get<TrackGroup>(
      `manage/trackGroups/${trackGroupId}`
    );
    setSelectedTrackGroup(trackGroup.result);
  };

  const getTrackGroupOptions = React.useCallback(
    async (searchString: string) => {
      if (artist) {
        const results = await api.getMany<TrackGroup>(
          `manage/artists/${artist.id}/trackGroups`,
          {
            title: searchString,
            take: "10",
          }
        );
        return results.results.map((r) => ({
          name: `${r.artist?.name} - ${r.title}`,
          id: r.id,
        }));
      }
      return [];
    },
    [artist]
  );

  const trackGroupId = selectedTrackGroup?.id;

  const generateDownloadCodes = React.useCallback(
    async (data: FormData) => {
      if (trackGroupId) {
        try {
          await api.post(`manage/trackGroups/${trackGroupId}/codes`, [
            {
              group: data.group,
              quantity: data.quantity,
            },
          ]);
          methods.reset();
          setSelectedTrackGroup(undefined);
          snackbar("Success", { type: "success" });
          setIsOpen(false);
          onDone();
        } catch (e) {
          console.error(e);
        }
      }
    },
    [methods, onDone, snackbar, trackGroupId]
  );

  return (
    <>
      <Button
        transparent
        onClick={() => {
          setIsOpen(true);
        }}
        startIcon={<FaPlus />}
        size="compact"
        variant="dashed"
      >
        {t("addDownloadCodes")}
      </Button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("generateDownloadCodes") ?? ""}
        contentClassName={css`
          min-height: 300px;
        `}
      >
        {!trackGroupId && (
          <>
            <label>{t("chooseAnAlbum")}</label>
            <AutoComplete
              getOptions={getTrackGroupOptions}
              onSelect={(val) => {
                onChooseAlbum(val);
              }}
            />
          </>
        )}
        {selectedTrackGroup && artist && (
          <div>
            <label>{t("selectedAlbum")}</label>
            <div
              className={css`
                display: flex;
                margin-top: 1rem;
              `}
            >
              <ImageWithPlaceholder
                src={selectedTrackGroup.cover?.sizes?.[120]}
                size={120}
                alt={selectedTrackGroup.title}
              />
              <SmallTileDetails
                title={selectedTrackGroup.title}
                subtitle={selectedTrackGroup.artist?.name ?? ""}
              />
              <Button
                startIcon={<FaTimes />}
                variant="dashed"
                onClick={() => setSelectedTrackGroup(undefined)}
              />
            </div>
            <FormComponent>
              <label>{t("groupName")}</label>
              <InputEl {...methods.register("group")} required />
            </FormComponent>
            <FormComponent>
              <label>{t("quantity")}</label>
              <InputEl
                type="number"
                {...methods.register("quantity")}
                defaultValue={100}
                required
              />
            </FormComponent>
            <Button onClick={methods.handleSubmit(generateDownloadCodes)}>
              {t("generate")}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default GenerateAlbumDownloadCodes;
