import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";
import { queryLabelBySlug } from "queries";

import TrackgroupGrid from "components/common/TrackgroupGrid";
import ArtistSquare from "components/Artist/ArtistSquare";
import LoadingBlocks from "components/Artist/LoadingBlocks";

function Label() {
  const { t } = useTranslation("translation", { keyPrefix: "label" });

  const { artistId } = useParams();

  if (!artistId) {
    return <div>{t("labelNotFound")}</div>;
  }

  const { data: label, isPending } = useQuery(queryLabelBySlug(artistId));

  if (isPending) {
    return <LoadingBlocks squares margin="1rem" />;
  }

  if (!label) {
    return <div>{t("labelNotFound")}</div>;
  }

  return (
    <TrackgroupGrid gridNumber="4" as="ul" role="list">
      {label?.artistLabels?.map((al) => (
        <ArtistSquare key={al.artist.id} artist={al.artist} />
      ))}
    </TrackgroupGrid>
  );
}

export default Label;
