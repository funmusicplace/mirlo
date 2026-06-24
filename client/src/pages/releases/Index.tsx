import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { queryTrackGroups, TrackGroupQueryOptions } from "queries";
import { queryTags } from "queries/tags";
import React from "react";
import { useTranslation, Trans } from "react-i18next";
import { FaChevronRight, FaRss } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import usePagination from "utils/usePagination";

import { bp } from "../../constants";

import ReleaseCard from "components/common/ReleaseCard";
import { ButtonAnchor, ButtonLink } from "components/common/Button";
import Select from "components/common/Select";
import WidthContainer from "components/common/WidthContainer";
import { SectionHeader } from "components/common/SectionHeader";
import TrackGroupPills from "components/TrackGroup/TrackGroupPills";

const pageSize = 40;

const Index = () => {
  const [params] = useSearchParams();
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { page, PaginationComponent } = usePagination({ pageSize });
  const tag = params.get("tag");
  const search = params.get("search");
  const [license, setLicense] = React.useState<
    TrackGroupQueryOptions["license"] | ""
  >((params.get("license") as TrackGroupQueryOptions["license"]) ?? "");

  const { data: newReleases } = useQuery(
    queryTrackGroups({
      skip: pageSize * page,
      take: pageSize,
      orderBy: undefined,
      tag: tag || undefined,
      title: search ?? undefined,
      isReleased: undefined,
      license: license || undefined,
    })
  );

  const { data: tags } = useQuery(
    queryTags({
      orderBy: "count",
      take: 24,
    })
  );

  return (
    <div
      className={css`
        padding: 2rem 0;

        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
      `}
    >
      <WidthContainer variant="big">
        <h1
          className={css`
            margin: var(--mi-side-paddings-xsmall);
          `}
        >
          {t("explore")}
        </h1>
      </WidthContainer>
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
          <h2 className="h5 section-header__heading">
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
          </h2>
          <div
            className={css`
              display: flex;
              gap: 0.75rem;
              @media screen and (max-width: ${bp.medium}px) {
                padding: var(--mi-side-paddings-xsmall);
              }
            `}
          >
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
            <ButtonAnchor
              aria-label={t("rssFeed")}
              title={t("rssFeed")}
              target="_blank"
              href={`${import.meta.env.VITE_API_DOMAIN}/v1/trackGroups?${tag ? `tag=${tag}` : ""}&released=released&format=rss`}
              rel="noreferrer"
              onlyIcon
              smallIcon
              className={css`
                margin-top: 0.25rem;
              `}
              startIcon={<FaRss />}
            />
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
            <TrackgroupGrid gridNumber="4" as="ul">
              {newReleases?.results?.map((trackGroup) => (
                <ReleaseCard
                  key={trackGroup.id}
                  trackGroup={trackGroup}
                  as="li"
                  showArtist
                  headingLevel="h3"
                />
              ))}
            </TrackgroupGrid>
          </div>

          {newReleases && (
            <PaginationComponent amount={newReleases.results.length} />
          )}
        </WidthContainer>
      </div>
    </div>
  );
};

export default Index;
