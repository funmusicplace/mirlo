import React from "react";
import ArtistTrackGroup from "./Artist/ArtistTrackGroup";
import api from "services/api";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { bp } from "../constants";

const Releases = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const [trackGroups, setTrackGroups] = React.useState<TrackGroup[]>([]);

  React.useEffect(() => {
    const callback = async () => {
      const results = await api.getMany<TrackGroup>("trackGroups");
      setTrackGroups(results.results);
    };

    callback();
  }, []);

  return (
    <div
      className={css`
        margin-top: 1rem;

        @media screen and (max-width: ${bp.medium}px) {
          margin-top: 0rem;
          margin-bottom: 0rem;
        }
      `}
    >
      <h2
        className={css`
          margin-bottom: 1rem;
          @media screen and (max-width: ${bp.medium}px) {
            margin-bottom: 0.5rem;
          }
        `}
      >
        {t("recentReleases")}
      </h2>
      <div
        className={css`
          display: flex;
          width: 100%;
          flex-direction: row;
          flex-wrap: wrap;
        `}
      >
        <div
          className={css`
              display: flex;
              width: 100%;
              flex-direction: row;
              flex-wrap: wrap;
              a:first-child {
                font-size: var(--mi-font-size-small);
              }
              a:last-child {
                font-size: var(--mi-font-size-small);
              }

              > div {
                flex: 23%;
                max-width: 23%;
                margin-left: 0rem;
                margin-right: 2%;
                padding: 0 !important;

                :nth-child(4n) {
                margin-left: 0rem;
                }

                @media screen and (max-width: ${bp.medium}px) {

                  a:first-child {
                    font-size: var(--mi-font-size-xsmall);
                  }
                  a:last-child {
                    font-size: var(--mi-font-size-xsmall);
                  }

                  max-width: 32%;
                  flex: 32%;
                  margin-right: 2%;

                  :nth-child(3n) {
                    border-top: 0;
                    margin-left: 0rem;
                    margin-right: 0rem;
                  }
                }

                @media screen and (max-width: ${bp.small}px) {

                  max-width: 48.5%;
                  flex: 48.5%;
                  margin-bottom: 1rem;

                  &:nth-child(odd) {
                    margin-left: 0rem;
                    margin-right: 1.5%;
                  }

                  &:nth-child(even) {
                    margin-right: 0rem;
                    margin-left: 1.5%;
                  }
              }
            `}
        >
          {trackGroups?.map((trackGroup) => (
            <ArtistTrackGroup key={trackGroup.id} trackGroup={trackGroup} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Releases;
