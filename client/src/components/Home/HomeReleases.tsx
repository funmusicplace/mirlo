import ArtistTrackGroup from "../Artist/ArtistTrackGroup";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { bp } from "../../constants";
import WidthContainer from "../common/WidthContainer";
import { SectionHeader } from "./Home";
import { FaChevronRight } from "react-icons/fa";
import LinkWithIcon from "components/common/LinkWithIcon";
import { useQuery } from "@tanstack/react-query";
import { queryTrackGroups } from "queries";

const bgcolor = css`
  width: 100%;
  background-color: var(--mi-lighter-background-color) !important;
  @media (prefers-color-scheme: dark) {
    background-color: #0a0a0a !important;
  }
`;

const Releases = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { data: trackGroups } = useQuery(
    queryTrackGroups({ take: 8, orderBy: "random" }),
  );

  return (
    <div className={bgcolor}>
      <WidthContainer variant="big">
        <div
          className={css`
            padding-top: 0.25rem;
            padding-bottom: 1rem;
            width: 100%;

            a {
              color: var(--mi-normal-foreground-color);
            }
            @media screen and (max-width: ${bp.medium}px) {
              margin-bottom: 0rem;
              padding-top: 0rem;
            }
          `}
        >
          <SectionHeader className={bgcolor}>
            <h5>{t("recentReleases")}</h5>
          </SectionHeader>
          <div
            className={css`
              padding-top: 0.25rem;

              display: flex;
              flex-direction: column;
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
              <TrackgroupGrid gridNumber={"4"}>
                {trackGroups?.results?.map((trackGroup) => (
                  <ArtistTrackGroup
                    key={trackGroup.id}
                    trackGroup={trackGroup}
                  />
                ))}
              </TrackgroupGrid>
            </div>
            <div
              className={css`
                align-self: flex-end;
              `}
            >
              <LinkWithIcon to="/releases">
                More releases <FaChevronRight />
              </LinkWithIcon>
            </div>
          </div>
        </div>
      </WidthContainer>
    </div>
  );
};

export default Releases;
