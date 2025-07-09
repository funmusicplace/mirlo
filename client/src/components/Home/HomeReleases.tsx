import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import WidthContainer from "../common/WidthContainer";
import { FaChevronRight } from "react-icons/fa";
import LinkWithIcon from "components/common/LinkWithIcon";

import { ButtonLink } from "components/common/Button";
import Releases from "components/Releases";
import { SectionHeader } from "./Home";
import { queryTopSoldTrackGroups } from "queries";
import { useQuery } from "@tanstack/react-query";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import ArtistTrackGroup from "components/Artist/ArtistTrackGroup";

const bgcolor = css`
  width: 100%;
`;

const futureReleasesPageSize = 6;

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
    <div className={bgcolor}>
      <Releases limit={8} />

      {(popularReleases?.results ?? []).length > 0 && (
        <>
          <SectionHeader>
            <WidthContainer
              variant="big"
              justify="space-between"
              className={css`
                flex-direction: row;
                display: flex;
              `}
            >
              <h1 className="h5 section-header__heading" id="popular-releases">
                {t("popularReleases")}
              </h1>
            </WidthContainer>
          </SectionHeader>
          <div
            className={css`
              padding-top: 0.25rem;
              margin-bottom: 4rem;
            `}
          >
            <WidthContainer variant="big" justify="center">
              <div
                className={css`
                  display: flex;
                  width: 100%;
                  flex-direction: row;
                  flex-wrap: wrap;
                  padding: var(--mi-side-paddings-xsmall);
                `}
              >
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
                    />
                  ))}
                </TrackgroupGrid>
              </div>
            </WidthContainer>
          </div>
        </>
      )}

      <WidthContainer
        variant="big"
        className={css`
          display: flex;
          gap: 1rem;
          justify-content: flex-end !important;
          margin-bottom: 4rem !important;
        `}
      >
        <LinkWithIcon to="/artists">{t("viewAllArtists")}</LinkWithIcon>
        <ButtonLink to="/releases" endIcon={<FaChevronRight />}>
          {t("moreReleases")}
        </ButtonLink>
      </WidthContainer>
    </div>
  );
};

export default HomeReleases;
