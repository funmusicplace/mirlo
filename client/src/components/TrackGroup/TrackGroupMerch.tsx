import { css } from "@emotion/css";

import { useTranslation } from "react-i18next";

import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

import DashedList from "components/ManageArtist/Merch/DashedList";
import { ButtonLink } from "components/common/Button";
import { FaChevronRight } from "react-icons/fa";

const TrackGroupMerch: React.FC<{ merch: Merch[] }> = ({ merch }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <div>
      <div
        className={css`
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        `}
      >
        {t("relatedMerch")}
      </div>
      <DashedList
        className={css`
          margin-bottom: 1rem;
          border: 0;
          li {
            padding: 0.25rem !important;
          }

          a {
            margin-right: 1rem;
          }
        `}
      >
        {merch?.map((item) => (
          <li key={item.id}>
            <div
              className={css`
                display: flex;
                align-items: center;

                > span {
                  margin-left: 1rem;
                }

                img {
                  height: 60px;
                }
              `}
            >
              <ImageWithPlaceholder
                src={item.images?.[0]?.sizes?.[60]}
                alt={item.title}
                size={60}
                square
              />
              <span>{item.title}</span>
            </div>
            <ButtonLink
              endIcon={<FaChevronRight />}
              to={`/${item.artistId}/merch/${item.id}`}
            >
              {t("buy")}
            </ButtonLink>
          </li>
        ))}
      </DashedList>
    </div>
  );
};

export default TrackGroupMerch;
