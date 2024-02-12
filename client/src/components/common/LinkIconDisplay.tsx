import {
  FaBandcamp,
  FaFacebook,
  FaGlobe,
  FaInstagram,
  FaTwitter,
} from "react-icons/fa";
import { FiMail } from "react-icons/fi";

export const linkUrlDisplay = (link: string) => {
  let url;
  if (link.startsWith("mailto:")) {
    console.log("link", link);
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
  if (url.includes("mailto")) {
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
