import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

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

const TrackGroupMerch: React.FC<{ merch: Merch[]; releaseArtist: Artist }> = ({
  merch,
  releaseArtist,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <div className="mt-4">
      <p className="mb-1.5 text-sm">{t("relatedMerch")}</p>
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
