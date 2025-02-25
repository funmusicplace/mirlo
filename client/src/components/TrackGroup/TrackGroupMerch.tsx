import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import DashedList from "components/ManageArtist/Merch/DashedList";
import TrackGroupMerchItem from "./TrackGroupMerchItem";

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
          <TrackGroupMerchItem key={item.id} item={item} />
        ))}
      </DashedList>
    </div>
  );
};

export default TrackGroupMerch;
