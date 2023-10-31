import { css } from "@emotion/css";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";

export const Footer = () => {
  const { t } = useTranslation("translation", { keyPrefix: "footer" });
  const {
    state: { user },
  } = useGlobalStateContext();
  if (!user?.id) {
    return null;
  }
  return (
    <div
      className={css`
        text-align: center;
        display: block;
        padding: 1rem;
        max-width: 640px;
        margin: 1rem auto 1rem;
      `}
    >
     <p
        className={css`
          margin-bottom: 1rem;
        `}
      >
        <Trans t={t} i18nKey="underConstruction">
          Mirlo is under construction. If you'd like to contribute check out
          <a href="https://github.com/funmusicplace/mirlo/">the code on GitHub</a>
          , <a href="https://discord.gg/VjKq26raKX">join our Discord</a>, or
          <a href="mailto:mirlodotspace@proton.me">email us</a>.
        </Trans>
      </p>
      <p>
        <Trans t={t} i18nKey="aboutUs">
          <Link to="/about">About us</Link> <Link to="/faq">FAQ</Link>
        </Trans>
      </p>
    </div>
  );
};
