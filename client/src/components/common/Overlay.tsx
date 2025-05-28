import { css } from "@emotion/css";

const Overlay: React.FC<{
  height: string;
  width: string;
  backgroundColor?: string;
}> = ({ height, width, backgroundColor }) => {
  const overlay = css`
    display: block;
    border: var(--mi-border);
    width: ${width};
    min-height: ${height};
    margin: 0 auto 0 auto;
    font-size: var(--mi-font-size-small);
    position: absolute;
    z-index: +1;
    border-radius: 5px;
    transition: 0.2s ease-in-out;
    background: linear-gradient(
      0deg,
      ${backgroundColor ?? "var(--mi-normal-background-color)"} 0%,
      ${backgroundColor ?? "var(--mi-normal-background-color)"} 10%,
      rgba(0, 0, 0, 0) 30%,
      rgba(0, 0, 0, 0) 100%
    );
    pointer-events: none;

    :hover {
      transition: 0.2s ease-in-out;
      background: linear-gradient(
        0deg,
        ${backgroundColor ?? "var(--mi-normal-background-color)"} 0%,
        ${backgroundColor ?? "var(--mi-normal-background-color)"} 10%,
        var(--mi-darken-background-color) 30%,
        rgba(0, 0, 0, 0) 100%
      );
    }
  `;
  return <div className={overlay}></div>;
};
export default Overlay;
