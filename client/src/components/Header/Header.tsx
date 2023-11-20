import { css } from "@emotion/css";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import usePublicArtist from "utils/usePublicObjectById";
import PageHeader from "components/common/PageHeader";
import { bp } from "../../constants";
import { useGlobalStateContext } from "../../state/GlobalState";
import HeaderSearch from "./HeaderSearch";
import Menu from "./Menu";
import Logo from "components/common/Logo";
import DropdownMenu from "components/common/DropdownMenu";
import { ImMenu } from "react-icons/im";

const Header = () => {
  const { state } = useGlobalStateContext();

  const { artistId, trackGroupId } = useParams();

  const { object: artist } = usePublicArtist<Artist>("artists", artistId);

  const artistBanner = artist?.banner?.sizes;

  if (!state.user?.id) {
    return null;
  }

  return (
    <header
      className={css`
        position: fixed;
        width: 100%;
        z-index: 999999;

        @media screen and (max-width: ${bp.medium}px) {
          position: sticky;
          ${artistBanner ? "background-color: transparent;" : ""}
          ${artistBanner ? "top: calc(var(--header-cover-sticky-height) - 24.2vw);" : ""}
          ${artistBanner ? "aspect-ratio: 4 / 1;" : ""}
          ${!artistBanner ? "border-bottom: 1px solid var(--mi-light-foreground-color);" : ""}

          ${trackGroupId ? "aspect-ratio: 0;" : ""}
          ${trackGroupId ? "top: 0px;" : ""}
          ${trackGroupId ? "position: relative;" : ""}


          border-bottom: 1px solid transparent;

          --header-cover-sticky-height: 55px;

          z-index: 999999;

          width: auto;
          min-height: auto;
        }
      `}
    >
      <div
        className={css`
          @media screen and (min-width: ${bp.medium}px) {
            display: none !important;
          }
        `}
      >
        <PageHeader />
      </div>
      <div
        className={css`
          position: absolute;
          height: 100%;
          width: 100%;
          @media screen and (min-width: ${bp.medium}px) {
            display: none !important;
          }
        `}
      ></div>
      <div
        className={css`
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 1rem;
          background-color: #ede8e8;
          width: 100%;
          z-index: 999999;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          position: sticky;
          top: 0px;
          height: 55px;

          Button {
            background-color: var(--mi-normal-background-color);
          }

          @media screen and (max-width: ${bp.medium}px) {
            padding: 0.5rem 0.5rem;
            ${artistBanner ? "background-color: transparent;" : ""}
            border-bottom: 1px solid transparent;
            //--header-cover-sticky-height: 48px;
            position: sticky;
            // top: calc(var(--header-cover-sticky-height) - 25vw);
            top: 0;
          }

          @media (prefers-color-scheme: dark) {
            background-color: #232428;

            @media screen and (max-width: ${bp.medium}px) {
          ${artistBanner ? "background-color: transparent;" : ""}
          border-bottom: 1px solid transparent;}
          }
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
            button {
              color: var(--mi-normal-foreground-color);
            }
            button:hover {
              color: var(--mi-normal-background-color);
              background-color: var(--mi-normal-foreground-color);
            }
          `}
        >
          <HeaderSearch />

          <DropdownMenu icon={<ImMenu />}>
            <Menu />
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
