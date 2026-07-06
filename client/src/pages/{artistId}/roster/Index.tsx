import { useQuery } from "@tanstack/react-query";
import ArtistSquare from "components/Artist/ArtistSquare";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { queryArtist } from "queries";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

function Index() {
  const { t } = useTranslation("translation", { keyPrefix: "label" });

  const { artistId: slug } = useParams();

  if (!slug) {
    return <div>{t("labelNotFound")}</div>;
  }

  const { data: artistAsLabel, isPending } = useQuery(
    queryArtist({ artistSlug: slug })
  );

  if (isPending) {
    return <LoadingBlocks squares margin="1rem" />;
  }

  if (!artistAsLabel) {
    return <div>{t("labelNotFound")}</div>;
  }

  return (
    <TrackgroupGrid gridNumber="4" as="ul" role="list">
      {artistAsLabel.user?.artistLabels?.map((al) => (
        <ArtistSquare key={al.artist.id} artist={al.artist} />
      ))}
    </TrackgroupGrid>
  );
}

export default Index;
