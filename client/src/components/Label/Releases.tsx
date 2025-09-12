import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";
import { queryPublicLabelTrackGroups } from "queries";

import TrackgroupGrid from "components/common/TrackgroupGrid";
import ArtistTrackGroup from "components/Artist/ArtistTrackGroup";

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
          <ArtistTrackGroup key={tg.id} trackGroup={tg} showArtist />
        ))}
      </TrackgroupGrid>
    </>
  );
}

export default Label;
