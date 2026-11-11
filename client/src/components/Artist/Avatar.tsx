import { css } from "@emotion/css";

import { bp } from "../../constants";

const Avatar: React.FC<{ avatar?: string; alt?: string }> = ({
  avatar,
  alt = "Artist avatar",
}) => {
  if (!avatar) {
    return null;
  }

  return (
    <div
      className={css`
        max-width: calc(120px * var(--page-scale, 1));
        display: flex;
        flex-shrink: 0;

        @media screen and (max-width: ${bp.medium}px) {
          max-width: 56px;
          padding-bottom: 0rem;
          margin-bottom: 0rem;
        }
      `}
    >
      <img
        src={avatar}
        alt={alt}
        className={css`
          width: 100%;
          border-radius: 100px;
        `}
      />
    </div>
  );
};
export default Avatar;
