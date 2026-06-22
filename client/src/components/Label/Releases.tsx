import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";
import { queryPublicLabelTrackGroups } from "queries";

import TrackgroupGrid from "components/common/TrackgroupGrid";
import ReleaseCard from "components/common/ReleaseCard";

function Label() {
  const { t } = useTranslation("translation", { keyPrefix: "label" });

  const { labelSlug } = useParams();

  if (!labelSlug) {
    return <div>{t("labelNotFound")}</div>;
  }

  const { data: releases } = useQuery(queryPublicLabelTrackGroups(labelSlug));

  if (!releases) {
    return <div>{t("labelNotFound")}</div>;
  }

  if (releases.results.length === 0) {
    return <div>{t("noReleasesFound")}</div>;
  }

  return (
    <>
      <TrackgroupGrid gridNumber="4" as="ul" role="list">
        {releases.results.map((tg) => (
          <ReleaseCard
            key={tg.id}
            trackGroup={tg}
            showArtist
            headingLevel="h2"
          />
        ))}
      </TrackgroupGrid>
    </>
  );
}

export default Label;
