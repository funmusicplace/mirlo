import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { queryTrackGroups, TrackGroupQueryOptions } from "queries";
import { queryTags } from "queries/tags";
import { useId } from "react";
import React from "react";
import { useTranslation, Trans } from "react-i18next";
import { FaChevronRight, FaRss } from "react-icons/fa";
import { useLocation, useSearchParams } from "react-router-dom";
import usePagination from "utils/usePagination";

import { bp } from "../constants";

import ArtistTrackGroup from "./Artist/ArtistTrackGroup";
import Select from "./common/Select";
import WidthContainer from "./common/WidthContainer";
import { SectionHeader } from "./Home/Home";
import TrackGroupPills from "./TrackGroup/TrackGroupPills";
import { IconButtonAnchor, ButtonLink } from "./common/Button";

const pageSize = 40;

const Releases: React.FC<{ limit?: number }> = ({ limit = pageSize }) => {
  const location = useLocation();
  const { pathname } = location;
  const [params] = useSearchParams();
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { page, PaginationComponent } = usePagination({ pageSize: limit });
  const tag = params.get("tag");
  const search = params.get("search");
  const [license, setLicense] = React.useState<
    TrackGroupQueryOptions["license"] | ""
  >((params.get("license") as TrackGroupQueryOptions["license"]) ?? "");

  const onReleasesPage = pathname.includes("releases");

  const { data: newReleases } = useQuery(
    queryTrackGroups({
      skip: limit * page,
      take: limit,
      orderBy: pathname?.includes("releases") ? undefined : "random",
      tag: tag || undefined,
      title: search ?? undefined,
      isReleased: pathname?.includes("releases") ? undefined : "released",
      license: license || undefined,
    })
  );

  const { data: tags } = useQuery(
    queryTags({
      orderBy: "count",
      take: 24,
    })
  );

  const id = useId();
  const headingId = `${id}-recent-releases`;

  return (
    <div
      className={css`
        padding: 2rem 0;

        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
      `}
    >
      {!tag && (
        <SectionHeader
          className={css`
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
            <div
              className={css`
                display: flex;
                justify-content: flex-end;

                @media screen and (max-width: ${bp.medium}px) {
                  padding: var(--mi-side-paddings-xsmall);
                }
              `}
            >
              <ButtonLink
                to="/tags"
                wrap
                className={css`
                  margin-top: 0.25rem;
                `}
                variant="outlined"
                endIcon={<FaChevronRight />}
              >
                {t("browseTags")}
              </ButtonLink>
            </div>
          </WidthContainer>
        </SectionHeader>
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
          <div
            className={css`
              display: flex;
              gap: 0.75rem;
              @media screen and (max-width: ${bp.medium}px) {
                padding: var(--mi-side-paddings-xsmall);
              }
            `}
          >
            {onReleasesPage && (
              <Select
                value={license ?? ""}
                onChange={(e) => {
                  const newLicense = e.target
                    .value as TrackGroupQueryOptions["license"];
                  setLicense(newLicense);
                }}
                options={[
                  { label: t("all"), value: "" },
                  { label: t("publicDomain"), value: "public-domain" },
                  { label: t("creativeCommons"), value: "creative-commons" },
                  {
                    label: t("allRightsReserved"),
                    value: "all-rights-reserved",
                  },
                ]}
              />
            )}
            <IconButtonAnchor
              target="_blank"
              href={`${import.meta.env.VITE_API_DOMAIN}/v1/trackGroups?${tag ? `tag=${tag}` : ""}&released=released&format=rss`}
              rel="noreferrer"
              size="compact"
              className={css`
                margin-top: 0.25rem;
              `}
              label="Open RSS feed"
            >
              <FaRss />
            </IconButtonAnchor>
          </div>
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
                  showArtist
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
