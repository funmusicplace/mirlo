import { css } from "@emotion/css";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import AutoComplete from "components/common/AutoComplete";
import FormComponent from "components/common/FormComponent";
import { hasId } from "components/ManageArtist/ManageTrackGroup/AlbumFormComponents/ManageTags";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";

const AddArtistToRoster: React.FC<{ refresh: () => void }> = ({ refresh }) => {
  const { user } = useAuthContext();
  const { t } = useTranslation("translation", { keyPrefix: "label" });

  const setLabel = React.useCallback(
    async (val: unknown) => {
      try {
        if (
          user?.id &&
          hasId(val) &&
          (typeof val.id === "string" || typeof val.id === "number")
        ) {
          await api.post(`manage/artists/${val.id}/labels`, {
            labelUserId: user.id,
            isLabelApproved: true,
          });
          refresh();
        }
      } catch (e) {
        refresh();
      }
    },
    [user?.id, refresh]
  );

  const searchArtists = React.useCallback(async (search: string) => {
    const options = await api.getMany<Artist>(
      `artists?name=${search}&includeUnpublished=true`
    );
    return options.results.map((r) => ({
      id: r.id,
      name: `${r.name} (${r.name})`,
    }));
  }, []);

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
        <label>{t("addExistingArtistToRoster")}</label>
        <AutoComplete getOptions={searchArtists} onSelect={setLabel} />
      </FormComponent>
      <FormComponent>
        <label>{t("addNewArtistToRoster")}</label>
        <ArtistButtonLink to="/manage/welcome" endIcon={<FaChevronRight />}>
          {t("createNewArtist")}
        </ArtistButtonLink>
      </FormComponent>
    </form>
  );
};

export default AddArtistToRoster;
