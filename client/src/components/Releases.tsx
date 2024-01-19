import React from "react";
import ArtistTrackGroup from "./Artist/ArtistTrackGroup";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import api from "services/api";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { bp } from "../constants";
import WidthContainer from "./common/WidthContainer";
import { SectionHeader } from "./Home/Home";

import usePagination from "utils/usePagination";

const pageSize = 40;

const Releases = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);
  const { page, PaginationComponent } = usePagination({ pageSize });

  React.useEffect(() => {
    const callback = async () => {
      const results = await api.getMany<TrackGroup>(
        `trackGroups?skip=${pageSize * page}&take=${pageSize}`
      );
      setTrackGroups(results.results);
    };

    callback();
  }, [page]);

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
          <h5>{t("recentReleases")}</h5>
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
            <TrackgroupGrid gridNumber="4">
              {trackGroups?.map((trackGroup) => (
                <ArtistTrackGroup key={trackGroup.id} trackGroup={trackGroup} />
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
