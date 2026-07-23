import { Link } from "react-router-dom";

export const Tags: React.FC<{ tags: string[]; onClick?: () => void }> = ({
  onClick,
  tags,
}) => {
  return (
    <ul className="mb-4" data-cy="tag-list">
      {tags.map((tag) => (
        <li
          key={tag}
          className="inline-block bg-white px-1.5 py-1 mr-1 mb-1 [@media(prefers-color-scheme:dark)]:bg-[#222] [[data-mi-high-contrast]_&]:bg-(--mi-chip-background-color)! [[data-mi-high-contrast]_&]:border [[data-mi-high-contrast]_&]:border-(--mi-chip-border-color)"
        >
          <Link
            to={`/library/tag/${tag.toLowerCase()}`}
            onClick={onClick}
            className="[[data-mi-high-contrast]_&]:text-(--mi-chip-text-color)!"
          >
            #{tag}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default Tags;
