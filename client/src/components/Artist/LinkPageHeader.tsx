import { css } from "@emotion/css";
import { ArtistTitle } from "components/common/ArtistHeaderSection";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronLeft } from "react-icons/fa";
import { getArtistUrl } from "utils/artist";

import { bp } from "../../constants";

import { ArtistButtonLink } from "./ArtistButtons";
import Avatar from "./Avatar";

const LinkPageHeader: React.FC<{
  artist: Pick<Artist, "id" | "name" | "avatar" | "isLabelProfile" | "urlSlug">;
}> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const artistAvatar = artist.avatar;

  return (
    <div
      className={css`
        display: flex;
        margin-bottom: 2rem;

        > div {
          margin-right: 1rem;
        }

        @media screen and (max-width: ${bp.medium}px) {
          > div {
            margin-right: 0.5rem;
          }
        }
      `}
    >
      {artistAvatar && (
        <div>
          <Avatar
            avatar={artistAvatar?.sizes?.[300] + `?${artistAvatar?.updatedAt}`}
          />
        </div>
      )}
      <div
        className={css`
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
        `}
      >
        <ArtistTitle artistAvatar={!!artistAvatar}>{artist.name}</ArtistTitle>
        <ArtistButtonLink
          to={getArtistUrl(artist)}
          startIcon={<FaChevronLeft />}
          variant="link"
          className={css`
            margin-top: 0.25rem;
          `}
        >
          {t(artist.isLabelProfile ? "backToLabel" : "backToArtist")}
        </ArtistButtonLink>
      </div>
    </div>
  );
};

export default LinkPageHeader;
