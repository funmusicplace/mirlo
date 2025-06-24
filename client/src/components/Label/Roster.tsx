import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";
import { queryLabelBySlug } from "queries";

import TrackgroupGrid from "components/common/TrackgroupGrid";
import ArtistSquare from "components/Artist/ArtistSquare";

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

  return (
    <>
      <TrackgroupGrid gridNumber="4" as="ul" role="list">
        {label?.artistLabels?.map((al) => (
          <ArtistSquare key={al.artist.id} artist={al.artist} />
        ))}
      </TrackgroupGrid>
    </>
  );
}

export default Label;
