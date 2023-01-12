import { css } from "@emotion/css";
import React from "react";
import {
  FaFacebook,
  FaGlobe,
  FaInstagram,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";

export const LinkToWeb: React.FC<{
  link: { uri: string; platform: string };
}> = ({ link }) => {
  const determineIcon = (text: string) => {
    if (text.includes("facebook")) {
      return <FaFacebook />;
    }
    if (text.includes("twitter")) {
      return <FaTwitter />;
    }
    if (text.includes("youtube")) {
      return <FaYoutube />;
    }
    if (text.includes("instagram")) {
      return <FaInstagram />;
    }
    return <FaGlobe />;
  };

  if (link.uri === "") {
    return null;
  }
  return (
    <a
      href={link.uri}
      key={link.uri}
      className={css`
        margin-right: 0.5rem;
      `}
    >
      {determineIcon(link.platform)}
    </a>
  );
};

export default LinkToWeb;
