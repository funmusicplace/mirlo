import React from "react";

import Modal from "components/common/Modal";
import { useTranslation } from "react-i18next";
import Button from "components/common/Button";
import { FaPlus } from "react-icons/fa";
import AutoComplete from "components/common/AutoComplete";
import api from "services/api";
import { useArtistContext } from "state/ArtistContext";
import { css } from "@emotion/css";
import TrackGroupCard from "./TrackGroupCard";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import SmallTileDetails from "components/common/SmallTileDetails";
import { InputEl } from "components/common/Input";
import FormComponent from "components/common/FormComponent";
import { useForm } from "react-hook-form";

const ManageArtistAlbumsTools: React.FC<{}> = () => {
  const methods = useForm();
  const {
    state: { artist },
  } = useArtistContext();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedTrackGroup, setSelectedTrackGroup] =
    React.useState<TrackGroup>();
  const { t } = useTranslation("translation", {
    keyPrefix: "manageArtistTools",
  });
  const userId = artist?.userId;

  const onChooseAlbum = async (trackGroupId: string | number) => {
    console.log("choosing trackGroupId", trackGroupId);
    const trackGroup = await api.get<TrackGroup>(
      `users/${userId}/trackGroups/${trackGroupId}`
    );
    setSelectedTrackGroup(trackGroup.result);
  };

  const getTrackGroupOptions = React.useCallback(
    async (searchString: string) => {
      const results = await api.getMany<TrackGroup>(
        `users/${userId}/trackGroups`,
        {
          title: searchString,
          take: "10",
        }
      );
      return results.results.map((r) => ({
        name: `${r.artist?.name} - ${r.title}`,
        id: r.id,
      }));
    },
    [userId]
  );

  return (
    <>
      <Button
        transparent
        onClick={() => {
          setIsOpen(true);
        }}
        startIcon={<FaPlus />}
        compact
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
        <p>{t("chooseAnAlbum")}</p>
        <AutoComplete
          getOptions={getTrackGroupOptions}
          onSelect={(val) => {
            onChooseAlbum(val);
          }}
        />{" "}
        {selectedTrackGroup && artist && (
          <div
            className={css`
              margin-top: 1rem;
            `}
          >
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
            </div>
            <FormComponent>
              <label>{t("groupName")}</label>
              <InputEl {...methods.register("group")} />
            </FormComponent>
            <FormComponent>
              <label>{t("quantity")}</label>
              <InputEl
                type="number"
                {...methods.register("quantity")}
                defaultValue={100}
              />
            </FormComponent>
            <Button>{t("generate")}</Button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ManageArtistAlbumsTools;
