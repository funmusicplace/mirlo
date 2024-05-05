import React, { useId } from "react";
import ArtistTrackGroup from "./Artist/ArtistTrackGroup";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import api from "services/api";
import { css } from "@emotion/css";
import { useTranslation, Trans } from "react-i18next";
import { bp } from "../constants";
import WidthContainer from "./common/WidthContainer";
import { SectionHeader } from "./Home/Home";

import usePagination from "utils/usePagination";
import { useSearchParams } from "react-router-dom";

const pageSize = 40;

const Releases = () => {
  const [params] = useSearchParams();
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);
  const { page, PaginationComponent } = usePagination({ pageSize });

  const tag = params.get("tag");

  React.useEffect(() => {
    const callback = async () => {
      const newParams = new URLSearchParams({
        skip: `${pageSize * page}`,
        take: `${pageSize}`,
      });
      if (tag) {
        newParams.append("tag", tag);
      }
      const results = await api.getMany<TrackGroup>(
        `trackGroups?${newParams.toString()}`
      );
      setTrackGroups(results.results);
    };

    callback();
  }, [page, tag]);

  const id = useId();
  const headingId = `${id}-recent-releases`;

  return (
    <div
      className={css`
        a {
          color: var(--mi-normal-foreground-color);
        }
        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
      `}
    >
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
              {trackGroups?.map((trackGroup) => (
                <ArtistTrackGroup
                  key={trackGroup.id}
                  trackGroup={trackGroup}
                  as="li"
                />
              ))}
            </TrackgroupGrid>
          </div>

          <PaginationComponent amount={trackGroups.length} />
        </WidthContainer>
      </div>
    </div>
  );
};

export default Releases;
