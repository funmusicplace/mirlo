import { useTranslation } from "react-i18next";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import React from "react";
import {
  findOutsideSite,
  linkUrlDisplay,
  linkUrlHref,
} from "components/common/LinkIconDisplay";
import { FaPen, FaPlus } from "react-icons/fa";
import { transformFromLinks } from "./ArtistFormLinks";
import { Link } from "react-router-dom";
import { ArtistButton } from "components/Artist/ArtistButtons";

const ArtistLinksInHeader: React.FC<{
  artist: Pick<Artist, "linksJson" | "links">;
  isManage: boolean;
  setIsEditing: (arg: boolean) => void;
}> = ({ artist, isManage, setIsEditing }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const allLinks = transformFromLinks(artist).linkArray;
  const links = isManage ? allLinks : allLinks.filter((l) => l.inHeader);

  return (
    <div
      className={css`
        margin-bottom: 0.25rem;
        display: flex;
        align-items: center;
      `}
    >
      <div
        className={css`
          a {
            display: inline-flex;
            align-items: center;
            margin-right: 0.75rem;
            color: var(--mi-normal-foreground-color);

            > svg {
              margin-right: 0.5rem;
            }
          }
        `}
      >
        {links.map((l) => {
          const site = findOutsideSite(l);
          return (
            <a
              rel="me"
              href={linkUrlHref(l.url, true)}
              key={l.url}
              target="_blank"
            >
              {site.icon} {linkUrlDisplay(l)}
            </a>
          );
        })}
        {!isManage && allLinks.length > links.length && (
          <Link to="links">
            <FaPlus />
            More links
          </Link>
        )}
      </div>

      {isManage && (
        <div>
          <ArtistButton
            size="compact"
            variant="dashed"
            onClick={() => setIsEditing(true)}
            startIcon={<FaPen />}
          >
            {links?.length === 0 ? t("noLinksYet") : t("editLinks")}
          </ArtistButton>
        </div>
      )}
    </div>
  );
};

export default ArtistLinksInHeader;
