import { css } from "@emotion/css";
import { bp } from "../../constants";

const Avatar: React.FC<{ avatar?: string }> = ({ avatar }) => {
  if (!avatar) {
    return null;
  }

  return (
    <div
      className={css`
        max-width: 110px;
        display: flex;

        @media screen and (max-width: ${bp.medium}px) {
          max-width: 70px;
          padding-bottom: 0rem;
          margin-bottom: 0rem;
        }
      `}
    >
      <img
        src={avatar}
        alt="Artist avatar"
        className={css`
          width: 100%;
          border-radius: 100px;
        `}
      />
    </div>
  );
};
export default Avatar;
