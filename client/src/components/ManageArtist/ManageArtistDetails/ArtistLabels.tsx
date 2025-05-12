import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import AutoComplete from "components/common/AutoComplete";
import FormComponent from "components/common/FormComponent";
import { queryManagedArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import { hasId } from "../ManageTrackGroup/AlbumFormComponents/ManageTags";

const ArtistLabels: React.FC<{ refetch: () => void }> = ({ refetch }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { artistId } = useParams();

  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));

  const removeLabel = React.useCallback(
    async (id: number | string) => {
      await api.delete(`manage/artists/${artistId}/labels/${id}`);
      await refetch();
    },
    [artistId]
  );

  const setLabel = React.useCallback(
    async (val: unknown) => {
      if (
        hasId(val) &&
        (typeof val.id === "string" || typeof val.id === "number")
      ) {
        await api.post(`manage/artists/${artistId}/labels`, {
          labelUserId: val.id,
        });
        await refetch();
      }
    },
    [artistId]
  );

  const searchLabels = React.useCallback(async (search: string) => {
    const options = await api.getMany<User>(`labels?email=${search}`);
    return options.results.map((r) => ({
      id: r.id,
      name: `${r.name} (${r.email})`,
    }));
  }, []);

  if (!artist) {
    return null;
  }

  return (
    <form
      className={css`
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: 100%;
        justify-content: space-between;
        margin-top: 1rem;
      `}
    >
      <FormComponent>
        <label>{t("whatLabelsisThisArtistPartOf")}</label>
        <AutoComplete getOptions={searchLabels} onSelect={setLabel} />
      </FormComponent>
    </form>
  );
};

export default ArtistLabels;
