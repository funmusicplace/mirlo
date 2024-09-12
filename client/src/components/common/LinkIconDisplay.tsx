import {
  FaBandcamp,
  FaFacebook,
  FaGlobe,
  FaInstagram,
  FaMastodon,
  FaTwitter,
} from "react-icons/fa";
import { FiMail } from "react-icons/fi";

// See: https://html.spec.whatwg.org/multipage/input.html#e-mail-state-(type%3Demail)
// This is modified to exclude the "/" symbol if it occurs before an @ sign - which avoids mastodon links being parsed as emails
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isEmailLink(link: string): boolean {
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

export const linkUrlDisplay = (link: string) => {
  let url;
  if (isEmailLink(link)) {
    return "Email";
  }
  url = findOutsideSite(link);

  try {
    url = new URL(link).origin.replace(/https?:\/\//, "");
  } catch (e) {
    url = link.split("/")[0];
  }

  return url;
};

export const findOutsideSite = (link: string) => {
  return (
    outsideLinks.find((site) => link.includes(site.matches)) ??
    outsideLinks[outsideLinks.length - 1]
  );
};

export const outsideLinks = [
  { matches: "mastodon", icon: <FaMastodon />, name: "Mastodon" },
  { matches: "twitter.com", icon: <FaTwitter />, name: "Twitter" },
  { matches: "x.com", icon: <FaTwitter />, name: "X" },
  { matches: "facebook.com", icon: <FaFacebook />, name: "Facebook" },
  { matches: "bandcamp.com", icon: <FaBandcamp />, name: "Bandcamp" },
  { matches: "instagram.com", icon: <FaInstagram />, name: "Instagram" },
  { matches: "@", icon: <FiMail />, name: "Email" },
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
