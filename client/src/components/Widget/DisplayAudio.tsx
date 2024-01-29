import { css } from "@emotion/css";

export const DisplayAudioWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div
      className={css`
        border-bottom: solid 0.25rem var(--mi-lighten-background-color);
      `}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          margin-bottom: -0.25rem;
          position: relative;
        `}
      >
        {children}
      </div>
    </div>
  );
};

export default DisplayAudioWrapper;
