import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import { sectionLabelClass } from "./ReleaseInfos";
import TrackGroupMerchItem from "./TrackGroupMerchItem";

const MerchList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px dashed var(--mi-tint-x-color);

  > li {
    border-bottom: 1px dashed var(--mi-tint-x-color);
  }
`;

const TrackGroupMerch: React.FC<{
  merch: Merch[];
  releaseArtist: Artist;
  centeredTitle?: boolean;
}> = ({ merch, releaseArtist, centeredTitle }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <div className="mt-4">
      <h2
        className={`${sectionLabelClass} ${centeredTitle ? "text-center" : ""}`}
      >
        {t("relatedMerch")}
      </h2>
      <MerchList>
        {merch?.map((item) => (
          <TrackGroupMerchItem
            key={item.id}
            item={item}
            releaseArtist={releaseArtist}
          />
        ))}
      </MerchList>
    </div>
  );
};

export default TrackGroupMerch;
