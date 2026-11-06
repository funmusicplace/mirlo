import styled from "@emotion/styled";
import ClickToPlayTracks from "components/common/ClickToPlayTracks";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import React from "react";

import { bp, coverSizeMax, coverSizeMin } from "../../constants";

import ImageWrapper from "./ImageWrapper";
import TrackGroupTitle from "./ItemViewTitle";

const ICONS_UNDER_COVER_HEIGHT = "3rem";
const CENTERED_ROW_TOP_GAP = "3rem";
const COVER_TOP_GAP = "1rem";
const HERO_CHROME_HEIGHT = "14rem";
const STACKED_LAYOUT_QUERY = `screen and (max-width: ${bp.small}px), screen and (max-height: 500px)`;

const Hero = styled.div<{ reserve: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: min(
    calc(
      100svh - var(--header-cover-sticky-height) - var(--player-reserved-height)
    ),
    calc(
      ${coverSizeMax} + ${(props) => props.reserve} + ${COVER_TOP_GAP} +
        ${HERO_CHROME_HEIGHT}
    )
  );
  padding: 1.5rem 0 1rem;

  @media ${STACKED_LAYOUT_QUERY} {
    min-height: 0;
  }
`;

const CoverSlot = styled.div<{ reserve: string }>`
  container-type: size;
  display: flex;
  justify-content: center;
  flex: 1 1 0;
  width: 100%;
  min-height: calc(
    ${coverSizeMin} + ${(props) => props.reserve} + ${COVER_TOP_GAP}
  );
  max-height: calc(
    ${coverSizeMax} + ${(props) => props.reserve} + ${COVER_TOP_GAP}
  );
  padding-top: ${COVER_TOP_GAP};

  @media ${STACKED_LAYOUT_QUERY} {
    container-type: normal;
    flex: none;
    min-height: 0;
    max-height: none;
  }
`;

const CoverColumn = styled.div<{ reserve: string }>`
  width: min(
    100cqw,
    calc(100cqh - ${(props) => props.reserve}),
    ${coverSizeMax}
  );

  @media ${STACKED_LAYOUT_QUERY} {
    width: min(100%, ${coverSizeMax});
  }
`;

const IconsUnderCover = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  height: ${ICONS_UNDER_COVER_HEIGHT};
`;

const ActionsRow = styled.div<{ rowGap: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-top: ${(props) => props.rowGap};
`;

const CoverFrame = styled(ImageWrapper)`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
`;

const CoverPlayButton = styled.div`
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translate(-50%, 50%);

  && button {
    width: 3.5rem;
    height: 3.5rem;
    box-shadow: 0 0 0 3px var(--mi-background-color);
  }
`;

const SingleTrackHero: React.FC<{
  trackGroup: TrackGroup;
  track: Track;
  title: string;
  subtitle?: React.ReactNode;
  coArtists?: React.ReactElement;
  secondaryActions: React.ReactNode;
  primaryAction?: React.ReactNode;
  badge?: React.ReactNode;
  sectionNav?: React.ReactNode;
}> = ({
  trackGroup,
  track,
  title,
  subtitle,
  coArtists,
  secondaryActions,
  primaryAction,
  badge,
  sectionNav,
}) => {
  const reserve = primaryAction ? ICONS_UNDER_COVER_HEIGHT : "0px";
  const rowGap = primaryAction
    ? "0px"
    : track.isPlayable
      ? CENTERED_ROW_TOP_GAP
      : COVER_TOP_GAP;

  return (
    <Hero reserve={reserve}>
      <TrackGroupTitle
        trackGroup={trackGroup}
        title={title}
        subtitle={subtitle}
        coArtists={coArtists}
        centered
      />
      <CoverSlot reserve={reserve}>
        <CoverColumn reserve={reserve}>
          <CoverFrame>
            <ImageWithPlaceholder
              src={trackGroup.cover?.sizes?.[960]}
              alt={trackGroup.coverImageAlt}
              size={960}
              square
              objectFit="contain"
            />
            {track.isPlayable && (
              <CoverPlayButton>
                <ClickToPlayTracks trackIds={[track.id]} />
              </CoverPlayButton>
            )}
          </CoverFrame>
          {primaryAction && (
            <IconsUnderCover>{secondaryActions}</IconsUnderCover>
          )}
        </CoverColumn>
      </CoverSlot>
      <ActionsRow rowGap={rowGap}>
        <div className="flex items-center justify-center gap-2">
          {primaryAction ?? secondaryActions}
        </div>
        {badge}
      </ActionsRow>
      {sectionNav}
    </Hero>
  );
};

export default SingleTrackHero;
