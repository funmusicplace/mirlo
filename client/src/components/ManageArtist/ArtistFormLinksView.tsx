import { useTranslation } from "react-i18next";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import React from "react";
import LinkIconDisplay, {
  findOutsideSite,
  linkUrlDisplay,
  linkUrlHref,
} from "components/common/LinkIconDisplay";
import { FaPen } from "react-icons/fa";
import { transformFromLinks } from "./ArtistFormLinks";

const ArtistFormLinksView: React.FC<{
  artist: Pick<Artist, "linksJson" | "links">;
  isManage: boolean;
  setIsEditing: (arg: boolean) => void;
}> = ({ artist, isManage, setIsEditing }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const links = transformFromLinks(artist).linkArray;
  return (
    <div
      className={css`
        margin-bottom: 0.25rem;
        display: flex;
        align-items: center;
      `}
    >
      <div>
        {links.map((l) => {
          const site = findOutsideSite(l.url);
          return (
            <a
              rel="me"
              href={linkUrlHref(l.url, true)}
              key={l.url}
              target="_blank"
              className={css`
                display: inline-flex;
                align-items: center;
                margin-right: 0.75rem;
                color: var(--mi-normal-foreground-color);

                > svg {
                  margin-right: 0.5rem;
                }
              `}
            >
              {site.icon} {linkUrlDisplay(l.url)}
            </a>
          );
        })}
      </div>
      {isManage && (
        <div>
          <Button
            compact
            thin
            variant="dashed"
            onClick={() => setIsEditing(true)}
            startIcon={<FaPen />}
          >
            {links?.length === 0 ? t("noLinksYet") : t("editLinks")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ArtistFormLinksView;
