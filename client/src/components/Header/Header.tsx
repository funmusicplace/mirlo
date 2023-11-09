import { css } from "@emotion/css";
import { Link } from "react-router-dom";
import { bp } from "../../constants";
import { useGlobalStateContext } from "../../state/GlobalState";
import HeaderSearch from "./HeaderSearch";
import Menu from "./Menu";
import Logo from "components/common/Logo";
import DropdownMenu from "components/common/DropdownMenu";
import { ImMenu } from "react-icons/im";

const Header = () => {
  const { state } = useGlobalStateContext();

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
      <div
        className={css`
          display: flex;
          align-items: center;
        `}
      >
        <HeaderSearch />

        <DropdownMenu icon={<ImMenu />}>
          <Menu />
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
