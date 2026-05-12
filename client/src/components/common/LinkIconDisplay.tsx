import { css } from "@emotion/css";
import {
  FaBandcamp,
  FaFacebook,
  FaGlobe,
  FaInstagram,
  FaMastodon,
  FaTwitter,
  FaSoundcloud,
  FaItchIo,
  FaDiscord,
  FaBluesky,
  FaYoutube,
  FaPatreon,
  FaTiktok,
  FaXTwitter,
  FaTwitch,
  FaVideo,
  FaSpotify,
  FaDeezer,
} from "react-icons/fa6";
import { FiMail } from "react-icons/fi";

import Logo from "./Logo";

const customIconClass = css`
  min-width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  object-fit: cover;
`;

// See: https://html.spec.whatwg.org/multipage/input.html#e-mail-state-(type%3Demail)
// This is modified to exclude the "/" symbol if it occurs before an @ sign - which avoids mastodon links being parsed as emails
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isEmailLink(link: string): boolean {
  if (link.startsWith("http")) {
    return false;
  }
  return link.startsWith("mailto:") || EMAIL_REGEX.test(link);
}

export function linkUrlHref(link: string, forDisplay?: boolean): string {
  if (isEmailLink(link)) {
    return forDisplay
      ? link.startsWith("mailto:")
        ? link
        : `mailto:${link}`
      : link;
  } else {
    // If the link doesn't start with "http://" or "https://", prefix it
    return /https?:\/\//.test(link) ? link : `https://${link}`;
  }
}

/**
 * Parse a user-entered URL safely. Returns `null` if the input isn't a valid
 * absolute URL. Used by the host-based matchers below; they refuse to assign a
 * platform icon to URLs that aren't parseable. See #1153.
 */
const parseLinkUrl = (urlString: string): URL | null => {
  try {
    return new URL(linkUrlHref(urlString));
  } catch {
    return null;
  }
};

/**
 * Match against an exact hostname or any of its subdomains. e.g. matchesHost
 * "youtube.com" accepts `youtube.com`, `m.youtube.com`, `www.youtube.com` but
 * rejects `youtube.com.evil.example`, `notyoutube.com`, or any URL whose path
 * merely contains "youtube.com" as a substring.
 */
const matchesHost =
  (...hosts: string[]) =>
  (parsed: URL): boolean => {
    const h = parsed.hostname.toLowerCase();
    return hosts.some(
      (host) => h === host.toLowerCase() || h.endsWith(`.${host.toLowerCase()}`)
    );
  };

/**
 * Mastodon is federated — any host can run an instance — so we can't pin
 * matching to a single domain. Conservative heuristic: hostname starts with
 * `mastodon.` (the convention used by the flagship instance and many smaller
 * ones). Custom-domain instances will surface the generic Website icon; the
 * artist can pick "Mastodon" manually from the link-type dropdown to override.
 *
 * The previous matcher used `url.includes("mastodon")` which false-matched
 * any URL containing the substring (e.g. `example.com/mastodon-fan`).
 */
const matchesMastodon = (parsed: URL): boolean => {
  const h = parsed.hostname.toLowerCase();
  return (
    h === "mastodon.social" ||
    h.startsWith("mastodon.") ||
    h.endsWith(".mastodon.social")
  );
};

const matchesPeerTube = (parsed: URL): boolean => {
  const h = parsed.hostname.toLowerCase();
  // PeerTube is federated so we can only heuristically detect it. Match
  // hostnames that start with `peertube.` (the conventional instance prefix);
  // other instances will fall through to the generic Website icon.
  return h.startsWith("peertube.") || h.includes(".peertube.");
};

export type OutsideLink = {
  name: string;
  icon?: JSX.Element;
  matches: (parsed: URL) => boolean;
  showFull?: boolean;
  isFallback?: boolean;
};

export const websiteSite: OutsideLink = {
  name: "Website",
  icon: <FaGlobe />,
  matches: () => false,
  showFull: true,
  isFallback: true,
};

const unknownSite: OutsideLink = {
  name: "Website",
  matches: () => false,
  showFull: true,
  isFallback: true,
};

const emailSite: OutsideLink = {
  name: "Email",
  icon: <FiMail />,
  matches: () => false,
};

/**
 * Recognized outside platforms. Order matters only for ambiguous matches; the
 * first entry whose `matches(url)` returns true wins. The Mastodon entry is
 * intentionally last among real platforms because its heuristic is the
 * loosest and we want explicit-domain platforms to take precedence.
 */
export const outsideLinks: OutsideLink[] = [
  {
    name: "Twitter",
    icon: <FaTwitter />,
    matches: matchesHost("twitter.com"),
  },
  { name: "X", icon: <FaXTwitter />, matches: matchesHost("x.com") },
  {
    name: "Facebook",
    icon: <FaFacebook />,
    matches: matchesHost("facebook.com", "fb.com"),
  },
  {
    name: "Bandcamp",
    icon: <FaBandcamp />,
    matches: matchesHost("bandcamp.com"),
  },
  {
    name: "Instagram",
    icon: <FaInstagram />,
    matches: matchesHost("instagram.com"),
  },
  {
    name: "SoundCloud",
    icon: <FaSoundcloud />,
    matches: matchesHost("soundcloud.com"),
  },
  { name: "Itch.io", icon: <FaItchIo />, matches: matchesHost("itch.io") },
  {
    name: "Discord",
    icon: <FaDiscord />,
    matches: matchesHost("discord.com", "discord.gg"),
  },
  { name: "Bluesky", icon: <FaBluesky />, matches: matchesHost("bsky.app") },
  {
    name: "YouTube",
    icon: <FaYoutube />,
    matches: matchesHost("youtube.com", "youtu.be"),
  },
  {
    name: "Patreon",
    icon: <FaPatreon />,
    matches: matchesHost("patreon.com"),
  },
  { name: "Twitch", icon: <FaTwitch />, matches: matchesHost("twitch.tv") },
  { name: "TikTok", icon: <FaTiktok />, matches: matchesHost("tiktok.com") },
  {
    name: "Spotify",
    icon: <FaSpotify />,
    matches: matchesHost("spotify.com", "open.spotify.com"),
  },
  { name: "Deezer", icon: <FaDeezer />, matches: matchesHost("deezer.com") },
  {
    name: "Mirlo",
    icon: (
      <Logo
        noWordmark
        className={css`
          width: 1rem;
          height: 1rem;
        `}
      />
    ),
    matches: matchesHost("mirlo.space"),
    showFull: true,
  },
  { name: "PeerTube", icon: <FaVideo />, matches: matchesPeerTube },
  { name: "Mastodon", icon: <FaMastodon />, matches: matchesMastodon },
  // Keep `websiteSite` last so it appears as an option in the link-type
  // dropdown but never wins the URL-based icon match (its `matches` predicate
  // always returns false). The auto-detect path falls through to it via
  // `?? websiteSite` in `findOutsideSite` / `LinkIconDisplay`.
  websiteSite,
];

export const linkUrlDisplay = (link: Link): string => {
  if (link.linkLabel) return link.linkLabel;

  if (isEmailLink(link.url)) {
    return "Email";
  }

  let linkDisplay = link.linkType;
  if (!linkDisplay || linkDisplay === "Email") {
    linkDisplay = findOutsideSite(link).name;
  }

  if (linkDisplay === websiteSite.name) {
    linkDisplay = parseUnknownSiteNameFromUrl(link.url) ?? linkDisplay;
  }

  return linkDisplay;
};

export const findOutsideSite = (link: Link): OutsideLink => {
  // 1. If the user explicitly picked a known linkType, honor it.
  const matchingSite = link.linkType
    ? outsideLinks.find((site) => site.name === link.linkType)
    : undefined;

  // 2. If a custom icon URL is provided and the chosen linkType isn't a
  //    pinned-platform match (or there's no chosen linkType), render the
  //    custom icon under the user-supplied label.
  const allowsCustomIcon = !!link.iconUrl && !matchingSite;

  if (allowsCustomIcon && link.iconUrl) {
    const derivedName =
      link.linkType && link.linkType.length > 0
        ? link.linkType
        : (parseUnknownSiteNameFromUrl(link.url) ?? websiteSite.name);

    return {
      ...websiteSite,
      icon: (
        <img
          src={link.iconUrl}
          alt=""
          className={customIconClass}
          aria-hidden
        />
      ),
      name: derivedName,
      showFull: true,
    };
  }

  if (matchingSite) {
    return matchingSite;
  }

  // 3. No explicit type — auto-detect from the URL via host-based matching.
  if (isEmailLink(link.url)) {
    return emailSite;
  }
  const parsed = parseLinkUrl(link.url);
  if (!parsed) return unknownSite;
  return outsideLinks.find((site) => site.matches(parsed)) ?? unknownSite;
};

const parseUnknownSiteNameFromUrl = (urlString: string) => {
  try {
    const url = new URL(urlString);
    const hostNameParts = url.hostname.split(".");
    const siteName = hostNameParts[hostNameParts.length - 2];
    return (
      siteName[0].toLocaleUpperCase() +
      siteName.substring(1).toLocaleLowerCase()
    );
  } catch {
    return undefined;
  }
};

export function getWebsiteSite(): OutsideLink {
  return websiteSite;
}

const LinkIconDisplay: React.FC<{ url: string }> = ({ url }) => {
  if (isEmailLink(url)) {
    return <FiMail />;
  }
  const parsed = parseLinkUrl(url);
  if (parsed) {
    const site = outsideLinks.find((s) => s.matches(parsed));
    if (site) return site.icon;
  }
  return <FaGlobe />;
};

export default LinkIconDisplay;
