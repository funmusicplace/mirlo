import styled from "@emotion/styled";
import MarkdownContent from "components/common/MarkdownContent";
import React from "react";
import { useTranslation } from "react-i18next";

import { bp } from "../../constants";

import { prominentSectionLabelClass, sectionLabelClass } from "./ReleaseInfos";
import TrackCredits from "./TrackCredits";

export const ANCHORS_BAR_CLEARANCE = "4rem";

const Sections = styled.div<{ twoColumns: boolean; alignLeft: boolean }>`
  max-width: 36rem;
  margin: ${(props) => (props.twoColumns ? "0" : "2.5rem auto 0")};
  text-align: ${(props) => (props.alignLeft ? "left" : "center")};
  overflow-wrap: anywhere;

  > section {
    scroll-margin-top: calc(
      var(--header-cover-sticky-height) +
        ${(props) => (props.twoColumns ? ANCHORS_BAR_CLEARANCE : "1rem")}
    );
  }

  > * + * {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--mi-tint-x-color);
  }

  @media screen and (max-width: ${bp.small}px) {
    padding: var(--mi-side-paddings-xsmall);
  }
`;

const TrackSections: React.FC<{
  track: Track;
  trackGroup: TrackGroup;
  twoColumns: boolean;
  alignLeft: boolean;
  aboutLabel: string;
  releaseAbout?: string | null;
  isSingleRelease?: boolean;
}> = ({
  track,
  trackGroup,
  twoColumns,
  alignLeft,
  aboutLabel,
  releaseAbout,
  isSingleRelease,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const titleAlignClass = alignLeft ? "text-left" : "text-center";

  return (
    <Sections twoColumns={twoColumns} alignLeft={alignLeft}>
      {track.lyrics && (
        <section id="lyrics" tabIndex={-1} className="outline-none">
          <h2 className={prominentSectionLabelClass}>{t("lyrics")}</h2>
          <p className="m-0 text-base italic leading-relaxed whitespace-pre-line">
            {track.lyrics}
          </p>
        </section>
      )}
      {(releaseAbout || track.description) && (
        <section id="about" tabIndex={-1} className="outline-none text-left">
          <h2 className={`${prominentSectionLabelClass} ${titleAlignClass}`}>
            {aboutLabel}
          </h2>
          {releaseAbout && (
            <MarkdownContent content={releaseAbout} className="mt-0!" />
          )}
          {track.description && (
            <p
              className={`m-0 max-w-prose whitespace-pre-line ${releaseAbout ? "mt-3!" : ""}`}
            >
              {track.description}
            </p>
          )}
        </section>
      )}
      <section id="credits" tabIndex={-1} className="outline-none">
        <h2 className={sectionLabelClass}>{t("credits")}</h2>
        <TrackCredits
          track={track}
          trackGroup={trackGroup}
          showReleaseCredits={isSingleRelease}
          alignLeft={alignLeft}
        />
      </section>
    </Sections>
  );
};

export default TrackSections;
