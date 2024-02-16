import { css } from "@emotion/css";
import Pill from "components/common/Pill";
import React from "react";
import { Link } from "react-router-dom";

const TrackGroupPills: React.FC<{ tags?: string[] }> = ({ tags }) => {
  if (!tags) {
    return null;
  }
  return (
    <div
      className={css`
        margin: 1rem 0;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      `}
    >
      {tags?.map((tag) => (
        <Link to={`/releases?tag=${tag}`}>
          <Pill isHoverable>{tag}</Pill>
        </Link>
      ))}
    </div>
  );
};

export default TrackGroupPills;
