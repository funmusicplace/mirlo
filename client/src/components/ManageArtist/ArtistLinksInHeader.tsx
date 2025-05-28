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
import {
  ArtistButton,
  ArtistButtonAnchor,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";

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
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;

          a {
            display: inline-flex;
            align-items: center;
            margin-right: 0.75rem;

            > svg {
              margin-right: 0.5rem;
            }
          }

          a:last-child {
            margin-right: 0;
          }
        `}
      >
        {links.map((l) => {
          const site = findOutsideSite(l);
          return (
            <ArtistButtonAnchor
              rel="me"
              href={linkUrlHref(l.url, true)}
              key={l.url}
              variant="link"
              startIcon={site?.icon}
              target="_blank"
              className={css`
                display: inline-flex;
                align-items: center;
              `}
            >
              {linkUrlDisplay(l)}
            </ArtistButtonAnchor>
          );
        })}
        {!isManage && allLinks.length > links.length && (
          <ArtistButtonLink to="links" size="compact" variant="dashed">
            More links
          </ArtistButtonLink>
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
