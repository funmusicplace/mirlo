import { useId } from "react";
import ArtistTrackGroup from "./Artist/ArtistTrackGroup";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { css } from "@emotion/css";
import { useTranslation, Trans } from "react-i18next";
import { bp } from "../constants";
import WidthContainer from "./common/WidthContainer";
import { SectionHeader } from "./Home/Home";

import usePagination from "utils/usePagination";
import { useSearchParams } from "react-router-dom";
import { queryTrackGroups } from "queries";
import { useQuery } from "@tanstack/react-query";
import { queryTags } from "queries/tags";
import TrackGroupPills from "./TrackGroup/TrackGroupPills";

const pageSize = 40;

const Releases = () => {
  const [params] = useSearchParams();
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { page, PaginationComponent } = usePagination({ pageSize });

  const tag = params.get("tag");

  const { data: trackGroups } = useQuery(
    queryTrackGroups({
      skip: pageSize * page,
      take: pageSize,
      tag: tag || undefined,
    })
  );

  const { data: tags } = useQuery(
    queryTags({
      orderBy: "count",
      take: 20,
    })
  );

  const id = useId();
  const headingId = `${id}-recent-releases`;

  return (
    <div
      className={css`
        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
      `}
    >
      {" "}
      <SectionHeader>
        <WidthContainer variant="big">
          <h2 className="h5 section-header__heading">Popular Tags</h2>
          <div
            className={css`
              margin: 0 0.5rem;
            `}
          >
            <TrackGroupPills tags={tags?.results.map((tag) => tag.tag)} />
          </div>
        </WidthContainer>
      </SectionHeader>
      <SectionHeader>
        <WidthContainer variant="big" justify="center">
          <h1 className="h5 section-header__heading" id={headingId}>
            {tag ? (
              <Trans
                t={t}
                i18nKey={"releasesForTag"}
                components={{ 0: <strong></strong> }}
                values={{ tag }}
              />
            ) : (
              t("recentReleases")
            )}
          </h1>
        </WidthContainer>
      </SectionHeader>
      <div
        className={css`
          padding-top: 0.25rem;
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
              gridNumber="4"
              as="ul"
              aria-labelledby={headingId}
              role="list"
            >
              {trackGroups?.results?.map((trackGroup) => (
                <ArtistTrackGroup
                  key={trackGroup.id}
                  trackGroup={trackGroup}
                  as="li"
                />
              ))}
            </TrackgroupGrid>
          </div>

          {trackGroups && (
            <PaginationComponent amount={trackGroups.results.length} />
          )}
        </WidthContainer>
      </div>
    </div>
  );
};

export default Releases;
