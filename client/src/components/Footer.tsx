import { css } from "@emotion/css";

export const Footer = () => {
  return (
    <div
      className={css`
        text-align: center;
        display: block;
        margin-bottom: 4rem;
        margin-top: 2rem;
      `}
    >
      Questions? <a href="mailto:mirlodotspace@proton.me">Contact us</a>. Want
      to help build Mirlo? Check out{" "}
      <a href="https://github.com/funmusicplace/mirlo/">the code on GitHub</a>{" "}
      or <a href="https://discord.gg/VjKq26raKX">join our Discord</a>.
    </div>
  );
};
