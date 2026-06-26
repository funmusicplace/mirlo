import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import ArtistSquare from "components/Artist/ArtistSquare";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { queryFeaturedArtists } from "queries/settings";
import { useTranslation } from "react-i18next";

import { bp } from "../../constants";
import WidthContainer from "../common/WidthContainer";

import { SectionHeader } from "components/common/SectionHeader";

const FeaturedArtistsSection = styled.section`
  width: 100%;
  background-color: color-mix(
    in srgb,
    var(--mi-text-color) 6%,
    var(--mi-background-color)
  );
  padding: 4rem 0;

  & > :first-child {
    margin-top: 0;
  }

  .image-container {
    background-color: #fff;
  }

  a {
    color: var(--mi-text-color);
  }

  ul {
    grid-template-columns: repeat(6, minmax(0, 7rem));
    justify-content: space-between;
    gap: 1.5rem 1rem;
  }

  @media screen and (max-width: ${bp.medium}px) {
    ul {
      grid-template-columns: repeat(3, minmax(0, 7rem));
    }
  }
`;

const HomeFeaturedArtists: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { data: featuredArtists } = useQuery(queryFeaturedArtists());

  if ((featuredArtists ?? []).length === 0) return null;

  return (
    <FeaturedArtistsSection aria-labelledby="featured-artists">
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
      <div className="pt-6">
        <WidthContainer variant="big" justify="center">
          <div className="flex w-full flex-row flex-wrap p-[var(--mi-side-paddings-xsmall)]">
            <TrackgroupGrid gridNumber="6" as="ul" role="list">
              {featuredArtists?.map((artist) => (
                <ArtistSquare key={artist.id} artist={artist} circle />
              ))}
            </TrackgroupGrid>
          </div>
        </WidthContainer>
      </div>
    </FeaturedArtistsSection>
  );
};

export default HomeFeaturedArtists;
