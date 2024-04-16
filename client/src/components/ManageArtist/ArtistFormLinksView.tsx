import { useTranslation } from "react-i18next";
import Button from "components/common/Button";
import { css } from "@emotion/css";
import React from "react";
import LinkIconDisplay, {
  linkUrlDisplay,
} from "components/common/LinkIconDisplay";
import { FaPen } from "react-icons/fa";

const ArtistFormLinksView: React.FC<{
  artist: Pick<Artist, "links">;
  isManage: boolean;
  setIsEditing: (arg: boolean) => void;
}> = ({ artist, isManage, setIsEditing }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  return (
    <div
      className={css`
        margin-bottom: 0.25rem;
        display: flex;
        align-items: center;
      `}
    >
      <div>
        {artist?.links?.map((l) => {
          return (
            <a
              rel="me"
              href={l}
              key={l}
              className={css`
                display: inline-flex;
                align-items: center;
                margin-right: 0.75rem;

                > svg {
                  margin-right: 0.5rem;
                }
              `}
            >
              <LinkIconDisplay url={l} /> {linkUrlDisplay(l)}
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
            {artist?.links?.length === 0 ? t("noLinksYet") : t("editLinks")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ArtistFormLinksView;
