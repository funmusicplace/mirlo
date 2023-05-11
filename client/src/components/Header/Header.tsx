import { css } from "@emotion/css";
import React from "react";
import { FaTimes } from "react-icons/fa";
import { ImMenu } from "react-icons/im";
import { Link } from "react-router-dom";
import { theme } from "utils/theme";
import { ReactComponent as ReactLogo } from "./logo.svg";
import { useGlobalStateContext } from "../../state/GlobalState";
import IconButton from "../common/IconButton";
import HeaderSearch from "./HeaderSearch";
import Menu from "./Menu";

const Header = () => {
  const { state } = useGlobalStateContext();

  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);

  return (
    <header
      className={css`
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        background-color: var(--mi-primary-highlight-color);
        position: fixed;
        width: 100%;
        z-index: 999999;
      `}
    >
      <h1
        className={css`
          margin-top: -0.1rem;
          line-height: 0;
          font-size: 1.5rem;
        `}
      >
        <Link
          to="/"
          className={css`
            display: flex;
            justify-content: flex-start;
            align-items: center;
          `}
        >
          mirlo
          <ReactLogo
            className={css`
              max-height: 2rem;
              max-width: 3rem;
            `}
          />
        </Link>
      </h1>
      {isMenuOpen && (
        <div
          className={css`
            position: absolute;
            top: 0;
            width: 100%;
            padding: 0.5rem;
            padding-bottom: 1rem;
            background: ${theme.colors.primaryHighlight};
          `}
        >
          <IconButton onClick={() => setIsMenuOpen(false)} transparent>
            <FaTimes />
          </IconButton>
          <Menu setIsMenuOpen={setIsMenuOpen} />
        </div>
      )}
      <div
        className={css`
          display: flex;
          align-items: center;
        `}
      >
        <HeaderSearch />
        {state.user && (
          <Link
            to="/profile"
            className={css`
              border: 1px solid var(--mi-primary-highlight-color--hover);
              border-radius: var(--mi-border-radius);
              padding: 0.25rem 0.75rem;
              color: var(--normal-background-color);
              text-decoration: none;
              background-color: var(--mi-secondary-color);
              margin-right: 1rem;

              &:hover {
                background-color: var(--mi-secondary-color--hover);
                color: var(--mi-);
              }
            `}
          >
            {state.user?.name}
          </Link>
        )}
        <IconButton
          transparent
          color="primary"
          onClick={() => {
            setIsMenuOpen(true);
          }}
        >
          <ImMenu color={theme.colors.text} />
        </IconButton>
      </div>
    </header>
  );
};

export default Header;
