import React from "react";
import ArtistTrackGroup from "../Artist/ArtistTrackGroup";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import api from "services/api";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";
import WidthContainer from "../common/WidthContainer";
import { SectionHeader } from "./Home";

const Releases = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);

  React.useEffect(() => {
    const callback = async () => {
      const results = await api.getMany<TrackGroup>("trackGroups?take=4");
      setTrackGroups(results.results);
    };

    callback();
  }, []);

  return (
    <WidthContainer variant="big">
      <div
        className={css`
          padding-top: 1rem;
          width: 100%;

          a {
            color: var(--mi-normal-foreground-color);
          }
          @media screen and (max-width: ${bp.medium}px) {
            margin-bottom: 0rem;
          }
        `}
      >
        <SectionHeader>
          <h5>{t("recentReleases")}</h5>
        </SectionHeader>
        <div
          className={css`
            padding-top: 0.25rem;
          `}
        >
          <div
            className={css`
              display: flex;
              flex-direction: row;
              flex-wrap: wrap;
              padding: var(--mi-side-paddings-xsmall);
            `}
          >
            <TrackgroupGrid>
              {trackGroups?.map((trackGroup) => (
                <ArtistTrackGroup key={trackGroup.id} trackGroup={trackGroup} />
              ))}
            </TrackgroupGrid>
          </div>
        </div>
      </div>
    </WidthContainer>
  );
};

export default Releases;
