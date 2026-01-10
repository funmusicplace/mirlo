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
import { css } from "@emotion/css";

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

export const linkUrlDisplay = (link: Link): string => {
  if (link.linkLabel) return link.linkLabel;

  if (isEmailLink(link.url)) {
    return "Email";
  }

  let linkDisplay = link.linkType;
  if (!linkDisplay || linkDisplay === "Email") {
    linkDisplay = findOutsideSite(link).name;
  }

  const websiteSite = getWebsiteSite();
  if (linkDisplay === websiteSite.name) {
    linkDisplay = parseUnknownSiteNameFromUrl(link.url) ?? linkDisplay;
  }

  return linkDisplay;
};

export const findOutsideSite = (link: Link) => {
  const matchingSite = link.linkType
    ? outsideLinks.find((site) => site.name === link.linkType)
    : undefined;

  const websiteSite = getWebsiteSite();
  const allowsCustomIcon =
    !!link.iconUrl && (!matchingSite || matchingSite.matches === "");

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

  let result =
    matchingSite ??
    outsideLinks.find((site) => link.url.includes(site.matches)) ??
    websiteSite;

  if (result.name === "Email" && !isEmailLink(link.url)) {
    result = websiteSite;
  }

  return result;
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

export const outsideLinks = [
  { matches: "mastodon", icon: <FaMastodon />, name: "Mastodon" },
  { matches: "peertube", icon: <FaVideo />, name: "PeerTube" },
  { matches: "twitter.com", icon: <FaTwitter />, name: "Twitter" },
  { matches: "x.com", icon: <FaXTwitter />, name: "X" },
  { matches: "facebook.com", icon: <FaFacebook />, name: "Facebook" },
  { matches: "bandcamp.com", icon: <FaBandcamp />, name: "Bandcamp" },
  { matches: "instagram.com", icon: <FaInstagram />, name: "Instagram" },
  { matches: "soundcloud.com", icon: <FaSoundcloud />, name: "SoundCloud" },
  { matches: "itch.io", icon: <FaItchIo />, name: "Itch.io" },
  { matches: "discord.com", icon: <FaDiscord />, name: "Discord" },
  { matches: "bsky.app", icon: <FaBluesky />, name: "Bluesky" },
  { matches: "youtube.com", icon: <FaYoutube />, name: "YouTube" },
  { matches: "patreon.com", icon: <FaPatreon />, name: "Patreon" },
  { matches: "twitch.tv", icon: <FaTwitch />, name: "Twitch" },
  { matches: "tiktok.com", icon: <FaTiktok />, name: "TikTok" },
  { matches: "spotify.com", icon: <FaSpotify />, name: "Spotify" },
  { matches: "deezer.com", icon: <FaDeezer />, name: "Deezer" },
  { matches: "@", icon: <FiMail />, name: "Email" },
  {
    matches: "mirlo.space",
    showFull: true,
    icon: (
      <Logo
        noWordmark
        className={css`
          width: 1rem;
          height: 1rem;
        `}
      />
    ),
    name: "Mirlo",
  },
  { matches: "", icon: <FaGlobe />, name: "Website", showFull: true },
];

function getWebsiteSite() {
  return (
    outsideLinks.find((site) => site.matches === "") ??
    outsideLinks[outsideLinks.length - 1]
  );
}

const LinkIconDisplay: React.FC<{ url: string }> = ({ url }) => {
  let icon = <FaGlobe />;
  const site = outsideLinks.find((site) => url.includes(site.matches));
  if (isEmailLink(url)) {
    icon = <FiMail />;
  } else if (site) {
    return site.icon;
  }
  return <>{icon}</>;
};

export default LinkIconDisplay;
