import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";
import { queryLabelBySlug } from "queries";

import TrackgroupGrid from "components/common/TrackgroupGrid";
import ArtistTrackGroup from "components/Artist/ArtistTrackGroup";

function Label() {
  const { t } = useTranslation("translation", { keyPrefix: "label" });

  const { labelSlug } = useParams();

  if (!labelSlug) {
    return <div>{t("labelNotFound")}</div>;
  }

  const { data: label } = useQuery(queryLabelBySlug(labelSlug));

  if (!label) {
    return <div>{t("labelNotFound")}</div>;
  }

  const trackGroups = label.artistLabels?.reduce((acc, al) => {
    if (al.artist?.trackGroups) {
      acc.push(...al.artist.trackGroups);
    }
    return acc;
  }, [] as TrackGroup[]);

  if (trackGroups.length === 0) {
    return <div>{t("noReleasesFound")}</div>;
  }

  return (
    <>
      <TrackgroupGrid gridNumber="4" as="ul" role="list">
        {trackGroups.map((tg) => (
          <ArtistTrackGroup key={tg.id} trackGroup={tg} />
        ))}
      </TrackgroupGrid>
    </>
  );
}

export default Label;
