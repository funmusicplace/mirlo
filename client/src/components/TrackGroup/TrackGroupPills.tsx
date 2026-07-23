import { css } from "@emotion/css";
import Pill from "components/common/Pill";
import React from "react";
import { Link } from "react-router-dom";

const TrackGroupPills: React.FC<{ tags?: string[]; centered?: boolean }> = ({
  tags,
  centered,
}) => {
  if (!tags?.length) {
    return null;
  }
  return (
    <div
      className={css`
        margin: 1rem 0;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        ${centered ? "justify-content: center;" : ""}
      `}
    >
      {tags?.map((tag) => (
        <Link
          to={`/releases?tag=${tag}`}
          key={tag}
          className="no-underline! [[data-mi-high-contrast]_&]:text-(--mi-chip-text-color)!"
        >
          <Pill
            isHoverable
            variant="tint"
            className="[[data-mi-high-contrast]_&]:bg-(--mi-chip-background-color)! [[data-mi-high-contrast]_&]:text-(--mi-chip-text-color)! [[data-mi-high-contrast]_&]:border! [[data-mi-high-contrast]_&]:border-(--mi-chip-border-color)! [[data-mi-high-contrast]_&]:hover:bg-(--mi-button-tint-x-color)! [[data-mi-high-contrast]_&]:hover:text-(--mi-chip-text-color)!"
          >
            {tag}
          </Pill>
        </Link>
      ))}
    </div>
  );
};

export default TrackGroupPills;
