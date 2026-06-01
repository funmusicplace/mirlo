import { useQuery } from "@tanstack/react-query";
import ArtistSquare from "components/Artist/ArtistSquare";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { queryFeaturedArtists } from "queries/settings";
import { useTranslation } from "react-i18next";

import WidthContainer from "../common/WidthContainer";

import { SectionHeader } from "./Home";

const HomeFeaturedArtists: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { data: featuredArtists } = useQuery(queryFeaturedArtists());

  if ((featuredArtists ?? []).length === 0) return null;

  return (
    <>
      <SectionHeader>
        <WidthContainer
          variant="big"
          justify="space-between"
          className="flex flex-row"
        >
          <h1 className="h5 section-header__heading" id="featured-artists">
            {t("featuredArtists")}
          </h1>
        </WidthContainer>
      </SectionHeader>
      <div className="pt-1 mb-8">
        <WidthContainer variant="big" justify="center">
          <div className="flex w-full flex-row flex-wrap p-[var(--mi-side-paddings-xsmall)]">
            <TrackgroupGrid
              gridNumber="6"
              as="ul"
              aria-labelledby="featured-artists"
              role="list"
            >
              {featuredArtists?.map((artist) => (
                <ArtistSquare key={artist.id} artist={artist} circle />
              ))}
            </TrackgroupGrid>
          </div>
        </WidthContainer>
      </div>
    </>
  );
};

export default HomeFeaturedArtists;
