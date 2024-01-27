import { css } from "@emotion/css";

export const DisplayAudioWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div
      className={css`
        border-bottom: solid 0.25rem var(--mi-lighten-background-color);
        margin-top: 0.5rem;
      `}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          width: 100%;
          margin-top: -1rem;
          padding: 1rem 0 0 0;
          position: relative;
          bottom: -0.25rem;
        `}
      >
        {children}
      </div>
    </div>
  );
};

export default DisplayAudioWrapper;
