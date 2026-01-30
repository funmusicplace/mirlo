import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ButtonAnchor } from "components/common/Button";
import MarkdownContent from "components/common/MarkdownContent";
import { queryInstanceArtist } from "queries/settings";
import React from "react";
import { FaArrowRight } from "react-icons/fa";

const Announcement: React.FC = () => {
  const { data: instanceArtist } = useQuery(queryInstanceArtist());

  if (!instanceArtist?.announcementText) {
    return null;
  }

  return (
    <div
      className={css`
        background: var(--mi-primary-color);
        color: var(--mi-secondary-color);
        padding: 1rem;
        border-radius: 5px;
        width: 100%;
        border-radius: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        font-size: 1.2rem;

        a {
          color: var(--mi-secondary-color);
          text-decoration: underline;
        }
      `}
    >
      <MarkdownContent content={instanceArtist.announcementText} />
    </div>
  );
};

export default Announcement;
