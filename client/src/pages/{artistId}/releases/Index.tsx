import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import PurchaseCatalogueButton from "components/Artist/PurchaseCatalogueButton";
import SortableArtistAlbums from "components/Artist/SortableArtistAlbums";
import ReleaseCard from "components/common/ReleaseCard";
import SectionActionStrip from "components/common/SectionActionStrip";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { NewAlbumButton } from "components/ManageArtist/NewAlbumButton";
import { queryArtist, queryPublicLabelTrackGroups } from "queries";
import React from "react";
import { useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

import { bp } from "../../../constants";

const Index: React.FC = () => {
  const { user } = useAuthContext();
  const { artistId } = useParams();
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  const { data: labelTrackGroups } = useQuery(
    queryPublicLabelTrackGroups(artistId)
  );

  if (!artist) {
    return null;
  }

  const releases = artist.isLabelProfile
    ? labelTrackGroups?.results
    : artist.trackGroups.map((tg) => ({ ...tg, artist }));

  const isArtistUserLoggedInUser = artist.userId === user?.id;

  if ((releases?.length ?? 0) === 0 && !isArtistUserLoggedInUser) {
    return null;
  }

  return (
    <div
      style={{ marginTop: "0rem" }}
      className={css`
        margin-bottom: 2rem;
        @media screen and (max-width: ${bp.medium}px) {
          border-radius: 0;
          margin-bottom: 0rem;
        }
      `}
    >
      {isArtistUserLoggedInUser && (
        <SectionActionStrip tight>
          <NewAlbumButton artist={artist} />
        </SectionActionStrip>
      )}
      {isArtistUserLoggedInUser && !artist.isLabelProfile && (
        <SortableArtistAlbums />
      )}
      {(!isArtistUserLoggedInUser ||
        (isArtistUserLoggedInUser && artist.isLabelProfile)) && (
        <>
          <TrackgroupGrid
            gridNumber={"3"}
            wrap
            as="ul"
            role="list"
            aria-labelledby="artist-navlink-releases"
          >
            {releases?.map((release) => (
              <ReleaseCard
                key={release.id}
                trackGroup={release}
                showArtist={artist.isLabelProfile}
                headingLevel="h2"
              />
            ))}
          </TrackgroupGrid>
        </>
      )}
      <div
        className={css`
          margin-top: 2rem;
          display: flex;
          justify-content: center;
        `}
      >
        <PurchaseCatalogueButton artist={artist} />
      </div>
    </div>
  );
};

export default Index;
