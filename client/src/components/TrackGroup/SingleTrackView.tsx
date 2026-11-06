import styled from "@emotion/styled";
import StickyColumn from "components/common/StickyColumn";
import {
  CoAuthorNames,
  getCoAuthors,
} from "components/common/TrackList/TrackAuthors";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { isSingleTrackRelease } from "utils/tracks";
import { useActiveSection } from "utils/useActiveSection";
import { useFitsBeside } from "utils/useFitsBeside";
import { useMatchMedia } from "utils/useMatchMedia";

import { bp, coverSizeMax } from "../../constants";

import FlagContent from "./FlagContent";
import PurchaseOrDownloadAlbum, {
  useReleasePurchaseState,
} from "./PurchaseOrDownloadAlbumModal";
import RecommendedAlbums from "./RecommendedAlbums";
import ReleaseArtistBlock from "./ReleaseArtistBlock";
import ReleasePurchaseNotes from "./ReleasePurchaseNotes";
import SectionAnchors, { SectionAnchor } from "./SectionAnchors";
import SingleTrackHero from "./SingleTrackHero";
import SubscriberExclusivePill from "./SubscriberExclusivePill";
import TrackGroupEmbed, { TrackEmbed } from "./TrackGroupEmbed";
import TrackGroupMerch from "./TrackGroupMerch";
import TrackSections, { ANCHORS_BAR_CLEARANCE } from "./TrackSections";
import Wishlist from "./Wishlist";
import WishlistTrack from "./WishlistTrack";

const TWO_COLUMNS_QUERY = `screen and (min-width: ${Number(bp.large) + 1}px) and (min-height: 501px)`;

const ACTIVE_SECTION_ZONE = "-115px 0px -40% 0px";

type ColumnsProps = { twoColumns: boolean };

const Columns = styled.div<ColumnsProps>`
  ${(props) =>
    props.twoColumns
      ? `
    display: grid;
    grid-template-columns: minmax(0, ${coverSizeMax}) minmax(0, 30rem);
    justify-content: center;
    gap: 5rem;
  `
      : ""}
`;

const ContentColumn = styled.div<ColumnsProps & { fits: boolean }>`
  ${(props) => {
    if (!props.twoColumns) {
      return "";
    }
    return props.fits
      ? "align-self: center;"
      : "padding-top: 1.5rem; overflow-y: clip;";
  }}
`;

const StickyAnchors = styled.div`
  container-type: inline-size;
  position: sticky;
  top: 0;
  z-index: 1;
  margin-top: calc(-1 * var(--header-cover-sticky-height));
  margin-bottom: 1rem;
  padding: calc(var(--header-cover-sticky-height) + 0.5rem) 0 0.5rem;
  background-color: var(--mi-background-color);

  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    height: 1rem;
    background: linear-gradient(var(--mi-background-color), transparent);
    pointer-events: none;
  }
`;

const CenteredBlock = styled.div<ColumnsProps>`
  max-width: 36rem;
  margin: ${(props) => (props.twoColumns ? "1rem 0 0" : "0 auto")};

  @media screen and (max-width: ${bp.small}px) {
    padding: var(--mi-side-paddings-xsmall);
  }
`;

const MerchBlock = styled(CenteredBlock)`
  scroll-margin-top: calc(var(--header-cover-sticky-height) + 1rem);
  outline: none;
  ${(props) =>
    props.twoColumns
      ? `
    margin-top: 2rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--mi-tint-x-color);
    scroll-margin-top: calc(var(--header-cover-sticky-height) + ${ANCHORS_BAR_CLEARANCE});
  `
      : ""}
`;

const SingleTrackView: React.FC<{
  trackGroup: TrackGroup;
  track: Track;
  artist: Artist;
  isSingleRelease?: boolean;
}> = ({ trackGroup, track, artist, isSingleRelease }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const { hash, pathname } = useLocation();

  const releaseAbout = isSingleRelease ? trackGroup.about : undefined;
  const hasLyrics = !!track.lyrics;
  const hasAbout = !!releaseAbout || !!track.description;
  const hasMerch = !!trackGroup.merch?.length;
  const aboutLabel = t(isSingleRelease ? "aboutTitle" : "aboutThisTrack");
  const isWideScreen = useMatchMedia(TWO_COLUMNS_QUERY);
  const twoColumns = isWideScreen && (hasLyrics || hasAbout);
  const alignLeft = twoColumns || !isWideScreen;
  const { referenceRef, contentRef, fits } = useFitsBeside(twoColumns);

  const scrolledToRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!hash) {
      scrolledToRef.current = null;
      return;
    }
    const destination = `${pathname}${hash}`;
    const target = document.getElementById(hash.slice(1));
    if (target && scrolledToRef.current !== destination) {
      scrolledToRef.current = destination;
      target.scrollIntoView();
      target.focus({ preventScroll: true });
    }
  }, [hash, pathname, hasLyrics, hasAbout, hasMerch]);

  const anchors: SectionAnchor[] = [
    ...(track.lyrics ? [{ id: "lyrics", label: t("lyrics") }] : []),
    ...(hasAbout ? [{ id: "about", label: aboutLabel }] : []),
    { id: "credits", label: t("credits") },
    ...(twoColumns && hasMerch ? [{ id: "merch", label: t("merch") }] : []),
  ];
  const { activeId: activeAnchorId, pinSection } = useActiveSection(
    twoColumns ? anchors.map((anchor) => anchor.id) : [],
    ACTIVE_SECTION_ZONE
  );

  React.useEffect(() => {
    if (hash) {
      pinSection(hash.slice(1));
    }
  }, [hash, pinSection]);

  const secondaryActions = (
    <>
      {isSingleRelease ? (
        <TrackGroupEmbed trackGroup={trackGroup} />
      ) : (
        <TrackEmbed track={track} trackGroup={trackGroup} />
      )}
      {isSingleTrackRelease(trackGroup) ? (
        <Wishlist trackGroup={trackGroup} inArtistPage />
      ) : (
        <WishlistTrack track={track} inArtistPage />
      )}
    </>
  );

  const coAuthors = getCoAuthors(track, artist);

  const purchaseProps = {
    trackGroup,
    track: !isSingleRelease && track.allowIndividualSale ? track : undefined,
    singleTrack: isSingleRelease ? track : undefined,
  };
  const trackPageLabelTarget = track.allowIndividualSale ? "track" : "album";
  const labelTarget =
    isSingleRelease || isSingleTrackRelease(trackGroup)
      ? undefined
      : trackPageLabelTarget;
  const { isVisible: hasPrimaryAction } =
    useReleasePurchaseState(purchaseProps);
  const primaryAction = hasPrimaryAction ? (
    <PurchaseOrDownloadAlbum {...purchaseProps} labelTarget={labelTarget} />
  ) : undefined;

  const showTrackSubtitle =
    isSingleRelease && !!track.title && track.title !== trackGroup.title;

  const purchaseExtras = (
    <>
      {trackGroup.merch && hasMerch && (
        <MerchBlock id="merch" tabIndex={-1} twoColumns={twoColumns}>
          <TrackGroupMerch
            merch={trackGroup.merch}
            releaseArtist={artist}
            centeredTitle={!alignLeft}
          />
        </MerchBlock>
      )}
      {isSingleRelease && (
        <CenteredBlock twoColumns={twoColumns}>
          <ReleasePurchaseNotes
            trackGroup={trackGroup}
            artist={artist}
            centered={!alignLeft}
            flush
          />
        </CenteredBlock>
      )}
    </>
  );

  return (
    <>
      <Columns twoColumns={twoColumns}>
        <div>
          <StickyColumn>
            <div ref={referenceRef}>
              <SingleTrackHero
                trackGroup={trackGroup}
                track={track}
                title={(isSingleRelease ? trackGroup.title : track.title) ?? ""}
                subtitle={showTrackSubtitle ? track.title : undefined}
                coArtists={
                  coAuthors.length > 0 ? (
                    <CoAuthorNames coAuthors={coAuthors} />
                  ) : undefined
                }
                secondaryActions={secondaryActions}
                primaryAction={primaryAction}
                badge={
                  isSingleRelease &&
                  trackGroup.isSubscriberExclusive && (
                    <SubscriberExclusivePill
                      artist={artist}
                      trackGroup={trackGroup}
                    />
                  )
                }
                sectionNav={
                  !twoColumns && (
                    <SectionAnchors anchors={anchors} className="mt-2" />
                  )
                }
              />
            </div>
          </StickyColumn>
        </div>
        <ContentColumn twoColumns={twoColumns} fits={fits}>
          {twoColumns && !fits && (
            <StickyAnchors>
              <SectionAnchors
                anchors={anchors}
                activeId={activeAnchorId}
                inColumn
                onAnchorClick={pinSection}
              />
            </StickyAnchors>
          )}
          <div ref={contentRef}>
            {!twoColumns && purchaseExtras}
            <TrackSections
              track={track}
              trackGroup={trackGroup}
              twoColumns={twoColumns}
              alignLeft={alignLeft}
              aboutLabel={aboutLabel}
              releaseAbout={releaseAbout}
              isSingleRelease={isSingleRelease}
            />
            {twoColumns && purchaseExtras}
          </div>
        </ContentColumn>
      </Columns>
      {isSingleRelease && (
        <RecommendedAlbums trackGroupId={trackGroup.id} artist={artist} />
      )}
      <ReleaseArtistBlock artist={artist} trackGroupId={trackGroup.id} />
      <footer className="flex justify-end mt-6">
        <FlagContent trackGroupId={trackGroup.id} />
      </footer>
    </>
  );
};

export default SingleTrackView;
