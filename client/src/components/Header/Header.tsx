/** @jsxImportSource @emotion/react */
import { css } from "@emotion/css";
import { css as reactCss } from "@emotion/react"
import React from "react";
import { FaTimes } from "react-icons/fa";
import { ImMenu } from "react-icons/im";
import { Link } from "react-router-dom";
import { bp } from "../../constants";
import { useGlobalStateContext } from "../../state/GlobalState";
import IconButton from "../common/IconButton";
import HeaderSearch from "./HeaderSearch";
import Menu from "./Menu";
import Background from "components/common/Background";
import Logo from "components/common/Logo";

const Header = () => {
  const { state } = useGlobalStateContext();

  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);

  if (!state.user?.id) {
    return null;
  }

  return (
    <header
      css={(theme) => reactCss`
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        background-color: ${theme.colors.background};
        position: fixed;
        width: 100%;
        z-index: 999999;
        border-bottom: 1px solid var(--mi-light-foreground-color);
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
          <span
            className={css`
              @media (max-width: ${bp.medium}px) {
                display: none;
              }
            `}
          >
            <Logo />
          </span>
          <span
            className={css`
              @media (min-width: ${bp.medium}px) {
                display: none;
              }
            `}
          >
            <Logo noWordmark />
          </span>
        </Link>
      </h1>
      {isMenuOpen && (
        <>
          <Background
            onClick={() => {
              setIsMenuOpen(false);
            }}
          />
          <div
            className={css`
              position: absolute;
              top: 0;
              width: 100%;
              padding: 0.5rem;
              z-index: 12;
              padding-bottom: 1rem;
              background: var(--mi-light-foreground-color);
            `}
          >
            <IconButton
              onClick={() => setIsMenuOpen(false)}
              transparent
              className={css`
                color: var(--mi-normal-foreground-color);
              `}
            >
              <FaTimes />
            </IconButton>
            <Menu setIsMenuOpen={setIsMenuOpen} />
          </div>
        </>
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
            css={(theme) => reactCss`
              border-radius: var(--mi-border-radius);
              padding: 0.25rem 0.75rem;
              color: var(--normal-background-color);
              text-decoration: none;
              background-color: ${theme.colors.translucentShade};
              margin-right: 1rem;

              &:hover {
                background-color: var(--mi-secondary-color--hover);
                color: var(--mi-);
              }

              @media (max-width: ${bp.small}px) {
                text-overflow: ellipsis;
                overflow: hidden;
                line-break: none;
                white-space: nowrap;
              }
            `}
          >
            {state.user?.name}
          </Link>
        )}
        <IconButton
          transparent
          onClick={() => {
            setIsMenuOpen(true);
          }}
        >
          <ImMenu color={"var(--mi-normal-foreground-color)"} />
        </IconButton>
      </div>
    </header>
  );
};

export default Header;
