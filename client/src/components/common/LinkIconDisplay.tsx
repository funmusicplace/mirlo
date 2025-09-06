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
} from "react-icons/fa6";
import { FiMail } from "react-icons/fi";
import Logo from "./Logo";

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

  var linkDisplay = link.linkType;
  if (!linkDisplay || linkDisplay === "Email") {
    linkDisplay = findOutsideSite(link).name;
  }

  if (linkDisplay === outsideLinks[outsideLinks.length - 1].name) {
    linkDisplay = parseUnknownSiteNameFromUrl(link.url) ?? linkDisplay;
  }

  return linkDisplay;
};

export const findOutsideSite = (link: Link) => {
  var result =
    outsideLinks.find(
      (site) => link.linkType !== "Email" && link.linkType === site.name
    ) ??
    outsideLinks.find((site) => link.url.includes(site.matches)) ??
    outsideLinks[outsideLinks.length - 1];
  if (result.name === "Email" && !isEmailLink(link.url)) {
    result = outsideLinks[outsideLinks.length - 1];
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
  { matches: "@", icon: <FiMail />, name: "Email" },
  { matches: "mirlo.space", icon: <Logo />, name: "Mirlo" },
  { matches: "", icon: <FaGlobe />, name: "Website" },
];

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
