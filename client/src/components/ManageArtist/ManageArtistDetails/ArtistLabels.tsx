import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import AutoComplete from "components/common/AutoComplete";
import FormComponent from "components/common/FormComponent";
import Pill from "components/common/Pill";
import { queryManagedArtist, useUpdateArtistMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "services/api";

const ArtistLabels = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { artistId } = useParams();

  const { data: artist, refetch } = useQuery(
    queryManagedArtist(Number(artistId))
  );

  const removeLabel = React.useCallback(
    async (id: number | string) => {
      await api.delete(`manage/artists/${artistId}/labels/${id}`);
      await refetch();
    },
    [artistId]
  );

  const setLabel = React.useCallback(
    async (id: number | string) => {
      await api.post(`manage/artists/${artistId}/labels`, {
        labelUserId: id,
      });
      await refetch();
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
      `}
    >
      <FormComponent>
        <label>{t("whatLabelsisThisArtistPartOf")}</label>
        <AutoComplete getOptions={searchLabels} onSelect={setLabel} />
        <div
          className={css`
            margin-top: 0.5rem;
          `}
        >
          {artist?.artistLabels?.map((l) => (
            <Pill>
              {l.labelUser.name}{" "}
              <ArtistButton
                startIcon={<FaTimes />}
                onClick={() => removeLabel(l.labelUserId)}
                onlyIcon
                type="button"
                variant="dashed"
              />
            </Pill>
          ))}
        </div>
      </FormComponent>
    </form>
  );
};

export default ArtistLabels;
