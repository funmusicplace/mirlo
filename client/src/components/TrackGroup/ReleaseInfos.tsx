import styled from "@emotion/styled";
import MarkdownContent from "components/common/MarkdownContent";
import React from "react";
import { useTranslation } from "react-i18next";

import { bp, coverSizeMax } from "../../constants";

import ReleaseDate from "./ReleaseDate";
import TrackGroupPills from "./TrackGroupPills";

const InfosGrid = styled.div`
  --infos-cover-size: var(--cover-size, ${coverSizeMax});

  display: grid;
  grid-template-columns:
    var(--infos-cover-size)
    minmax(0, calc(var(--infos-cover-size) * 1.3));
  justify-content: center;
  align-items: start;
  gap: 1.5rem;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--mi-tint-x-color);

  @media screen and (max-width: ${bp.small}px) {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-top: 1.5rem;
    padding: 1.25rem 0.5rem 0;
  }
`;

const sectionLabelBaseClass =
  "mt-0! mx-0! leading-tight! tracking-wider uppercase text-(--mi-light-foreground-color)!";

export const sectionLabelClass = `${sectionLabelBaseClass} mb-2! text-xs! font-bold!`;

export const prominentSectionLabelClass = `${sectionLabelBaseClass} mb-3! text-base! font-normal!`;

const ReleaseInfos: React.FC<{
  trackGroup: TrackGroup;
  showAbout: boolean;
}> = ({ trackGroup, showAbout }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const trackCount = trackGroup.tracks.length;
  const hasAbout = showAbout && !!trackGroup.about;
  const hasCredits = !!trackGroup.credits || !!trackGroup.coverCredit;
  const hasMeta = !!trackGroup.releaseDate || trackCount > 0;
  const hasTags = !!trackGroup.tags?.length;

  if (!hasAbout && !hasCredits && !hasMeta && !hasTags) {
    return null;
  }

  return (
    <InfosGrid>
      {hasAbout && (
        <div className="col-start-2 row-start-1 min-w-0 max-w-prose">
          <h2 className={prominentSectionLabelClass}>{t("aboutTitle")}</h2>
          <MarkdownContent content={trackGroup.about} className="mt-0!" />
        </div>
      )}
      <div className="col-start-1 row-start-1 min-w-0">
        {hasCredits && <h2 className={sectionLabelClass}>{t("credits")}</h2>}
        <div className="flex flex-col gap-2 text-sm text-(--mi-light-foreground-color)">
          {hasMeta && (
            <div className="flex flex-wrap gap-x-1.5">
              <ReleaseDate releaseDate={trackGroup.releaseDate} inline />
              {trackGroup.releaseDate && trackCount > 0 && (
                <span aria-hidden>·</span>
              )}
              {trackCount > 0 && (
                <span>{t("trackCount", { count: trackCount })}</span>
              )}
            </div>
          )}
          {trackGroup.coverCredit && (
            <p className="m-0">
              {t("coverCredit", { credit: trackGroup.coverCredit })}
            </p>
          )}
          {trackGroup.credits && (
            <MarkdownContent
              content={trackGroup.credits}
              className="mt-0! opacity-100!"
            />
          )}
        </div>
        <TrackGroupPills tags={trackGroup.tags} />
      </div>
    </InfosGrid>
  );
};

export default ReleaseInfos;
