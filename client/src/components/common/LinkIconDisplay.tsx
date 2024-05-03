import {
  FaBandcamp,
  FaFacebook,
  FaGlobe,
  FaInstagram,
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

export function linkUrlHref(link: string): string {
  if (isEmailLink(link)) {
    return link.startsWith("mailto:") ? link : `mailto:${link}`;
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
  try {
    url = new URL(link).origin.replace(/https?:\/\//, "");
  } catch (e) {
    url = link.split("/")[0];
  }

  if (url.includes("instagram.com")) {
    return "Instagram";
  }

  return url;
};

const LinkIconDisplay: React.FC<{ url: string }> = ({ url }) => {
  let icon = <FaGlobe />;
  if (isEmailLink(url)) {
    icon = <FiMail />;
  } else if (url.includes("twitter.com")) {
    icon = <FaTwitter />;
  } else if (url.includes("x.com")) {
    icon = <FaTwitter />;
  } else if (url.includes("facebook.com")) {
    icon = <FaFacebook />;
  } else if (url.includes("bandcamp.com")) {
    icon = <FaBandcamp />;
  } else if (url.includes("instagram.com")) {
    icon = <FaInstagram />;
  }
  return <>{icon}</>;
};

export default LinkIconDisplay;
