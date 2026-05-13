import { css } from "@emotion/css";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import AutoComplete from "components/common/AutoComplete";
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
    <div className="md:flex w-full flex-row items-start justify-between gap-6">
      <form className="md:w-1/2">
        <h3 id="label-existing-artist">{t("addExistingArtistToRoster")}</h3>
        <p className="mbs-1" id="description-existing-artist">
          {t("addExistingArtistExplanation")}
        </p>
        <AutoComplete
          ariaDescribedBy="description-existing-artist"
          ariaLabelledBy="label-existing-artist"
          className="mbs-4"
          getOptions={searchArtists}
          id="input-existing-artist"
          onSelect={setLabel}
        />
      </form>
      <div className="md:w-1/2">
        <h3>{t("addNewArtistToRoster")}</h3>
        <p className="mbs-1">{t("addNewArtistExplanation")}</p>
        <ArtistButtonLink
          className="mbs-4"
          variant="outlined"
          to="/manage/welcome"
          endIcon={<FaChevronRight />}
        >
          {t("createNewArtist")}
        </ArtistButtonLink>
      </div>
    </div>
  );
};

export default AddArtistToRoster;
