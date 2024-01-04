import { css } from "@emotion/css";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useGlobalStateContext } from "state/GlobalState";
import WidthContainer from "./common/WidthContainer";
import { bp } from "../constants";

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
        margin: 0rem auto;
        padding: var(--mi-side-paddings-normal);
        max-width: var(--mi-container-big);
        z-index: 2;
        width: 100%;

        @media screen and (max-width: ${bp.medium}px) {
          border-radius: 0;
          padding: 0;
          z-index: 0;
        }
      `}
    >
      <WidthContainer variant="big" justify="center">
        <div
          className={css`
            background-color: var(--mi-normal-background-color);
            padding: 2rem;
          `}
        >
          <p
            className={css`
              margin-bottom: 1rem;
            `}
          >
            <Trans
              t={t}
              i18nKey="underConstruction"
              components={{
                github: (
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  <a href="https://github.com/funmusicplace/mirlo/"></a>
                ),
                // eslint-disable-next-line jsx-a11y/anchor-has-content,
                discord: <a href="https://discord.gg/VjKq26raKX"></a>,
                // eslint-disable-next-line jsx-a11y/anchor-has-content
                email: <a href="mailto:mirlodotspace@proton.me"></a>,
              }}
            />
          </p>
          <p>
            <Trans
              t={t}
              i18nKey="aboutUs"
              components={{
                faq: <Link to="/pages/faq"></Link>,
                about: <Link to="/pages/about"></Link>,
                terms: <Link to="/pages/terms"></Link>,
                privacy: <Link to="/pages/privacy"></Link>,
                cookie: <Link to="/pages/cookie-policy"></Link>,
              }}
            />
          </p>
        </div>
      </WidthContainer>
    </div>
  );
};
