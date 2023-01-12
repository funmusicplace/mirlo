import { css } from "@emotion/css";

export const Disclaimer = () => {
  return (
    <p
      className={css`
        margin: 1rem 0;
      `}
    >
      Using resonate means you agree with the{" "}
      <a href="https://community.resonate.coop/docs?topic=1865">
        terms and conditions outlined here
      </a>
      .
    </p>
  );
};

export default Disclaimer;
