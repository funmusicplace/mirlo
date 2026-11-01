import MarkdownContent from "components/common/MarkdownContent";
import React from "react";
import { useTranslation } from "react-i18next";

const ReleaseCreditLines: React.FC<{ trackGroup: TrackGroup }> = ({
  trackGroup,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  return (
    <>
      {trackGroup.coverCredit && (
        <p className="m-0">
          {t("coverCredit", { credit: trackGroup.coverCredit })}
        </p>
      )}
      {trackGroup.credits && (
        <MarkdownContent
          content={trackGroup.credits}
          className="mt-0! opacity-100! text-left"
        />
      )}
    </>
  );
};

export default ReleaseCreditLines;
