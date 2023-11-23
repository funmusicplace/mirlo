import { FaBandcamp, FaFacebook, FaGlobe, FaTwitter } from "react-icons/fa";

const LinkIconDisplay: React.FC<{ url: string }> = ({ url }) => {
  let icon = <FaGlobe />;
  if (url.includes("twitter.com") || url.includes("x.com")) {
    icon = <FaTwitter />;
  }
  if (url.includes("facebook.com")) {
    icon = <FaFacebook />;
  }
  if (url.includes("bandcamp.com")) {
    icon = <FaBandcamp />;
  }
  return <>{icon}</>;
};

export default LinkIconDisplay;
