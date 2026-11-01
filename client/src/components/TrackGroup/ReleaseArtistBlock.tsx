import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import ArtistRouterLink from "components/Artist/ArtistButtons";
import FollowArtist from "components/common/FollowArtist";
import ScrollRail from "components/common/ScrollRail";
import SupportArtistButton from "components/common/SupportArtistButton";
import { queryPublicLabelTrackGroups, queryUserStripeStatus } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import {
  canSupportArtist,
  canUserEditArtist,
  getArtistReleasesUrl,
  getArtistUrl,
} from "utils/artist";
import useIsSubscribedToArtist from "utils/useIsSubscribedToArtist";
import { useMatchMedia } from "utils/useMatchMedia";

import { bp } from "../../constants";

import { calculateDateWithTimezoneOffset } from "./ReleaseDate";
import ReleaseLinkCard from "./ReleaseLinkCard";

const MAX_OTHER_RELEASES = 20;

const Panel = styled.div<{ hasReleases: boolean }>`
  display: grid;
  grid-template-columns: ${(props) =>
    props.hasReleases ? "16rem minmax(0, 1fr)" : "minmax(0, 1fr)"};
  margin-top: 2.5rem;
  overflow: hidden;
  background-color: color-mix(
    in srgb,
    var(--mi-button-color) 14%,
    var(--mi-background-color)
  );
  border: 1px solid color-mix(in srgb, var(--mi-button-color) 25%, transparent);
  border-radius: 0.5rem;

  @media screen and (max-width: ${bp.small}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Identity = styled.div<{ stacked: boolean }>`
  display: flex;
  gap: 0.75rem 1rem;
  padding: 1.25rem;
  ${(props) =>
    props.stacked
      ? `
    flex-direction: column;
    contain: size;
    border-right: 1px solid
      color-mix(in srgb, var(--mi-button-color) 20%, transparent);
  `
      : `
    flex-wrap: wrap;
    align-items: center;
  `}

  @media screen and (max-width: ${bp.small}px) {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    contain: none;
    padding: 1rem;
    border-right: 0;
    ${(props) =>
      props.stacked
        ? "border-bottom: 1px solid color-mix(in srgb, var(--mi-button-color) 20%, transparent);"
        : ""}
  }
`;

const FittedBio: React.FC<{
  text: string;
  containerRef: React.RefObject<HTMLElement | null>;
  headerRef: React.RefObject<HTMLElement | null>;
}> = ({ text, containerRef, headerRef }) => {
  const textRef = React.useRef<HTMLParagraphElement>(null);
  const isWide = useMatchMedia(
    `screen and (min-width: ${Number(bp.small) + 1}px)`
  );

  React.useEffect(() => {
    const container = containerRef.current;
    const header = headerRef.current;
    const textEl = textRef.current;
    if (!container || !header || !textEl) return;
    if (!isWide) {
      textEl.style.removeProperty("-webkit-line-clamp");
      textEl.style.removeProperty("max-height");
      return;
    }
    const observer = new ResizeObserver(() => {
      const lineHeight = parseFloat(getComputedStyle(textEl).lineHeight) || 20;
      const gap = parseFloat(getComputedStyle(container).rowGap) || 0;
      const available = container.clientHeight - header.offsetHeight - gap;
      const lines = Math.max(Math.floor((available + 1) / lineHeight), 0);
      textEl.style.setProperty(
        "-webkit-line-clamp",
        String(Math.max(lines, 1))
      );
      textEl.style.maxHeight = `${lines * lineHeight}px`;
    });
    observer.observe(container);
    observer.observe(header);
    return () => observer.disconnect();
  }, [isWide, containerRef, headerRef]);

  return (
    <p
      ref={textRef}
      className="m-0 text-sm line-clamp-2 overflow-hidden sm:min-h-0"
    >
      {text}
    </p>
  );
};

const ReleaseArtistBlock: React.FC<{
  artist: Artist;
  trackGroupId: number;
}> = ({ artist, trackGroupId }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const { t: tArtist } = useTranslation("translation", { keyPrefix: "artist" });

  const identityLinkRef = React.useRef<HTMLAnchorElement>(null);
  const identityHeaderRef = React.useRef<HTMLDivElement>(null);

  const { user } = useAuthContext();
  const isPaidSubscriber = useIsSubscribedToArtist(artist.id);
  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist.userId)
  );
  const { data: labelTrackGroups, isPending: isLoadingLabelReleases } =
    useQuery(
      queryPublicLabelTrackGroups(
        artist.isLabelProfile ? artist.urlSlug : undefined
      )
    );

  const otherReleases = (
    artist.isLabelProfile
      ? (labelTrackGroups?.results ?? [])
      : artist.trackGroups.map((tg) => ({ ...tg, artist }))
  )
    .filter((tg) => tg.id !== trackGroupId)
    .slice(0, MAX_OTHER_RELEASES);
  const hasReleases =
    otherReleases.length > 0 ||
    (artist.isLabelProfile && isLoadingLabelReleases);

  const isOwner = canUserEditArtist(user, artist, { allowAdmin: false });
  const showSupport =
    !isOwner &&
    (isPaidSubscriber || canSupportArtist(artist, stripeAccountStatus));
  const avatarSrc = artist.avatar?.sizes?.[300];
  const avatar = avatarSrc && (
    <img
      src={avatarSrc}
      alt=""
      className="size-16 max-sm:size-14 shrink-0 rounded-full object-cover"
    />
  );

  return (
    <Panel hasReleases={hasReleases}>
      <Identity stacked={hasReleases}>
        <Link
          ref={identityLinkRef}
          to={getArtistUrl(artist)}
          className={`group flex gap-x-4 gap-y-3 flex-1 min-w-0 min-h-0 text-(--mi-text-color)! no-underline! ${
            hasReleases ? "flex-col justify-center" : "items-center"
          }`}
        >
          {hasReleases ? (
            <>
              <div
                ref={identityHeaderRef}
                className="flex items-center gap-3 min-w-0"
              >
                {avatar}
                <span className="min-w-0 text-sm leading-tight font-bold break-words group-hover:underline">
                  {artist.name}
                </span>
              </div>
              {artist.shortDescription && (
                <FittedBio
                  text={artist.shortDescription}
                  containerRef={identityLinkRef}
                  headerRef={identityHeaderRef}
                />
              )}
            </>
          ) : (
            <>
              {avatar}
              <div className="flex flex-col gap-1 flex-1 min-w-0 min-h-0">
                <span className="font-bold break-words group-hover:underline">
                  {artist.name}
                </span>
                {artist.shortDescription && (
                  <p className="text-sm line-clamp-3 max-sm:line-clamp-2">
                    {artist.shortDescription}
                  </p>
                )}
              </div>
            </>
          )}
        </Link>
        {!isOwner && (
          <div
            className={`flex flex-wrap items-center gap-2 max-sm:basis-full ${hasReleases ? "sm:mt-auto" : ""}`}
          >
            <FollowArtist artistId={artist.id} hideWhenSubscribed />
            {showSupport && (
              <SupportArtistButton
                artist={artist}
                label={tArtist("support")}
                size="compact"
              />
            )}
          </div>
        )}
      </Identity>
      {hasReleases && (
        <ScrollRail
          className="p-5 max-sm:p-4 min-w-0"
          title={t("otherReleasesBy", { artistName: artist.name })}
          headerAction={
            <ArtistRouterLink
              to={getArtistReleasesUrl(artist)}
              aria-label={t("seeAllReleasesBy", { artistName: artist.name })}
              className="text-sm no-underline! hover:underline!"
            >
              {t("seeAllReleases")}
            </ArtistRouterLink>
          }
          itemWidth="7rem"
          mobileItemWidth="6rem"
        >
          {otherReleases.map((release) => {
            const year = release.releaseDate
              ? calculateDateWithTimezoneOffset(
                  release.releaseDate
                ).getFullYear()
              : undefined;
            const subtitle = artist.isLabelProfile
              ? [release.artist?.name, year].filter(Boolean).join(" · ")
              : year;
            return (
              <li key={release.id}>
                <ReleaseLinkCard trackGroup={release} subtitle={subtitle} />
              </li>
            );
          })}
        </ScrollRail>
      )}
    </Panel>
  );
};

export default ReleaseArtistBlock;
