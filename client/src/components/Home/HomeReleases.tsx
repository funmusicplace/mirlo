import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import ArtistTrackGroup from "components/Artist/ArtistTrackGroup";
import { ButtonLink } from "components/common/Button";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import Releases from "components/Releases";
import { queryTopSoldTrackGroups } from "queries";
import { useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";

import WidthContainer from "../common/WidthContainer";

import { SectionHeader } from "./Home";
import HomeFeaturedArtists from "./HomeFeaturedArtists";

const futureReleasesPageSize = 6;

const PopularReleasesSection = styled.div`
  padding: 4rem 0;

  & > :first-child {
    margin-top: 0;
  }
`;

const HomeReleases = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });

  const { data: popularReleases } = useQuery(
    queryTopSoldTrackGroups({
      skip: 0,
      take: futureReleasesPageSize,
      datePurchased: "pastMonth",
    })
  );

  return (
    <div className="w-full">
      <Releases limit={8} />

      <WidthContainer
        variant="big"
        className="flex gap-4 !justify-end !mb-16 max-md:p-[var(--mi-side-paddings-xsmall)]"
      >
        <ButtonLink wrap variant="outlined" to="/artists">
          {t("viewAllArtists")}
        </ButtonLink>
        <ButtonLink wrap to="/releases" endIcon={<FaChevronRight />}>
          {t("moreReleases")}
        </ButtonLink>
      </WidthContainer>

      <HomeFeaturedArtists />

      {(popularReleases?.results ?? []).length > 0 && (
        <PopularReleasesSection>
          <SectionHeader>
            <WidthContainer
              variant="big"
              justify="space-between"
              className="flex flex-row"
            >
              <h1 className="h5 section-header__heading" id="popular-releases">
                {t("popularReleases")}
              </h1>
            </WidthContainer>
          </SectionHeader>
          <div className="pt-1">
            <WidthContainer variant="big" justify="center">
              <div className="flex w-full flex-row flex-wrap p-[var(--mi-side-paddings-xsmall)]">
                <TrackgroupGrid
                  gridNumber="6"
                  as="ul"
                  aria-labelledby="popular-releases"
                  role="list"
                >
                  {popularReleases?.results?.map((trackGroup) => (
                    <ArtistTrackGroup
                      key={trackGroup.id}
                      trackGroup={trackGroup}
                      as="li"
                      size="small"
                      showArtist
                    />
                  ))}
                </TrackgroupGrid>
              </div>
            </WidthContainer>
          </div>
        </PopularReleasesSection>
      )}
    </div>
  );
};

export default HomeReleases;
