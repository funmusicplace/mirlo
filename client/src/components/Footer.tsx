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
        z-index: 2;
        background: var(--mi-normal-background-color);
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
          }}
        />
      </p>
    </div>
  );
};
