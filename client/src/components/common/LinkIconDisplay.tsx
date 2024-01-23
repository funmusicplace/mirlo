import {
  FaBandcamp,
  FaFacebook,
  FaGlobe,
  FaInstagram,
  FaTwitter,
} from "react-icons/fa";

export const linkUrlDisplay = (link: string) => {
  let url;
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
  if (url.includes("twitter.com")) {
    icon = <FaTwitter />;
  }
  if (url.includes("facebook.com")) {
    icon = <FaFacebook />;
  }
  if (url.includes("bandcamp.com")) {
    icon = <FaBandcamp />;
  }
  if (url.includes("instagram.com")) {
    icon = <FaInstagram />;
  }
  return <>{icon}</>;
};

export default LinkIconDisplay;
