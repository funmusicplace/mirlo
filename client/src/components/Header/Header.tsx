import { css } from "@emotion/css";
import React from "react";
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
      className={css`
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        background-color: var(--mi-normal-background-color);
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
              top: 64px;
              right: 0;
              // width: 100%;
              padding: 0.5rem;
              z-index: 12;
              padding-bottom: 1rem;
              background: var(--mi-normal-background-color);
            `}
          >
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
