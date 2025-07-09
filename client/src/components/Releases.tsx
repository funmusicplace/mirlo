import { useId } from "react";
import ArtistTrackGroup from "./Artist/ArtistTrackGroup";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { css } from "@emotion/css";
import { useTranslation, Trans } from "react-i18next";
import { bp } from "../constants";
import WidthContainer from "./common/WidthContainer";
import { SectionHeader } from "./Home/Home";

import usePagination from "utils/usePagination";
import { useLocation, useSearchParams } from "react-router-dom";
import { queryTrackGroups } from "queries";
import { useQuery } from "@tanstack/react-query";
import { queryTags } from "queries/tags";
import TrackGroupPills from "./TrackGroup/TrackGroupPills";
import { ButtonAnchor } from "./common/Button";
import { FaRss } from "react-icons/fa";

const pageSize = 40;
const futureReleasesPageSize = 6;

const Releases: React.FC<{ limit?: number }> = ({ limit = pageSize }) => {
  const location = useLocation();
  const { pathname } = location;
  const [params] = useSearchParams();
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { page, PaginationComponent } = usePagination({ pageSize: limit });
  const tag = params.get("tag");
  const search = params.get("search");

  const { data: newReleases } = useQuery(
    queryTrackGroups({
      skip: limit * page,
      take: limit,
      orderBy: pathname?.includes("releases") ? undefined : "random",
      tag: tag || undefined,
      title: search ?? undefined,
      isReleased: pathname?.includes("releases") ? undefined : "released",
    })
  );

  const { data: futureReleases } = useQuery(
    queryTrackGroups({
      skip: futureReleasesPageSize * page,
      take: futureReleasesPageSize,
      tag: tag || undefined,
      title: search ?? undefined,
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
        padding: 2rem 0;
        background-color: var(--mi-white);

        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
      `}
    >
      {!tag && (
        <SectionHeader
          className={css`
            position: sticky;
            background-color: var(--mi-white);
          `}
        >
          <WidthContainer variant="big">
            <h2 className="h5 section-header__heading">{t("popularTags")}</h2>
            <div
              className={css`
                margin: 0 0.5rem;
              `}
            >
              <TrackGroupPills tags={tags?.results.map((tag) => tag.tag)} />
            </div>
          </WidthContainer>
        </SectionHeader>
      )}
      {!pathname.includes("releases") &&
        (futureReleases?.results ?? []).length > 0 && (
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
                <h1 className="h5 section-header__heading" id={headingId}>
                  {t("futureReleases")}
                </h1>
                <ButtonAnchor
                  target="_blank"
                  href={`${import.meta.env.VITE_API_DOMAIN}/v1/trackGroups?tag=${tag}&released=not-released&format=rss`}
                  rel="noreferrer"
                  onlyIcon
                  className={css`
                    margin-top: 0.25rem;
                  `}
                  startIcon={<FaRss />}
                />
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
                    gridNumber="6"
                    as="ul"
                    aria-labelledby={headingId}
                    role="list"
                  >
                    {futureReleases?.results?.map((trackGroup) => (
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
      <SectionHeader>
        <WidthContainer
          variant="big"
          justify="space-between"
          className={css`
            flex-direction: row;
            display: flex;
          `}
        >
          <h1 className="h5 section-header__heading" id={headingId}>
            {tag ? (
              <Trans
                t={t}
                i18nKey={"releasesForTag"}
                components={{ tag: <strong></strong> }}
                values={{ tag }}
              />
            ) : search ? (
              t("recentReleasesFor", { search })
            ) : (
              t("recentReleases")
            )}
          </h1>
          <ButtonAnchor
            target="_blank"
            href={`${import.meta.env.VITE_API_DOMAIN}/v1/trackGroups?tag=${tag}&released=released&format=rss`}
            rel="noreferrer"
            onlyIcon
            className={css`
              margin-top: 0.25rem;
            `}
            startIcon={<FaRss />}
          />
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
              {newReleases?.results?.map((trackGroup) => (
                <ArtistTrackGroup
                  key={trackGroup.id}
                  trackGroup={trackGroup}
                  as="li"
                />
              ))}
            </TrackgroupGrid>
          </div>

          {pathname.includes("releases") && newReleases && (
            <PaginationComponent amount={newReleases.results.length} />
          )}
        </WidthContainer>
      </div>
    </div>
  );
};

export default Releases;
