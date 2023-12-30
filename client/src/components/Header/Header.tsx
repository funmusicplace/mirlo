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
import styled from "@emotion/styled";
import useShow from "utils/useShow";
import LogInPopup from "./LogInPopup";

const HeaderWrapper = styled.div<{
  artistBanner?: boolean;
  transparent?: boolean;
  artistId?: boolean;
  show?: string;
  trackGroupId?: boolean;
}>`
  position: sticky;
  width: 100%;
  z-index: 999;
  transition: top 0.4s ease-out;

  ${(props) =>
    props.transparent
      ? `background: transparent; 
         box-shadow: 0px 1px 10px rgba(0, 0, 0, 0);`
      : `background: var(--mi-light-background-color); 
         box-shadow: 0px 1px 5px rgba(0, 0, 0, 0.1);`}

  ${(props) =>
    props.trackGroupId
      ? `background-color: var(--mi-normal-background-color) !important; 
         box-shadow: 0px 1px 5px rgba(0, 0, 0, 0.1) !important;`
      : ""}

  @media (prefers-color-scheme: dark) {
    ${(props) =>
      props.transparent
        ? `background-color: transparent; 
           box-shadow: 0px 1px 10px rgba(0, 0, 0, 0);`
        : `background-color: #0e0e0e; 
           box-shadow: 0px 1px 5px rgba(0, 0, 0, 0.3); 
           color: pink;`}
    ${(props) =>
      props.artistId && !props.artistBanner
        ? "background-color: var(--mi-normal-background-color);"
        : ""}
  }

  ${(props) =>
    props.trackGroupId
      ? "background-color: var(--mi-normal-background-color);"
      : ""}

  @media screen and (max-width: ${bp.medium}px) {
    position: sticky;
    display: flex;
    align-items: flex-start;

    ${(props) =>
      props.artistBanner && !props.trackGroupId
        ? `top: calc(var(--header-cover-sticky-height) - 25vw); 
           aspect-ratio: 4 / 1; 
           width: auto; 
           min-height: auto; 
           transition: top 0.4s ease-out;`
        : ""}
    ${(props) =>
      props.artistBanner && !props.trackGroupId && props.show === "up"
        ? `top: calc(var(--header-cover-sticky-height) - 25vw); 
           aspect-ratio: 4 / 1; 
           width: auto; 
           min-height: auto; 
           transition: top 0.4s ease-out;`
        : ""}
    ${(props) =>
      props.artistBanner && !props.trackGroupId && props.show === "down"
        ? `top: calc(var(--header-cover-sticky-height) - 50vw); 
           aspect-ratio: 4 / 1; 
           width: auto; 
           min-height: auto; 
           transition: top 0.4s ease-out;`
        : ""}


    ${(props) => (props.trackGroupId ? "aspect-ratio: 0;" : "")}

    @media (prefers-color-scheme: dark) {
      ${(props) =>
        props.artistBanner || props.transparent
          ? `background: transparent; 
             box-shadow: 0px 1px 10px rgba(0, 0, 0, 0);`
          : "box-shadow: 0px 1px 10px rgba(0, 0, 0, .5);"}
    }
  }
`;

const LogoWrapper = () => {
  return (
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
  );
};

const Content = styled.div<{ artistId?: string }>`
  ${(props) =>
    props.artistId
      ? "max-width: 100%; transition: all ease-in-out .4s;"
      : "max-width: 1500px; transition: all ease-in-out .4s;"}
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  width: 100%;
  z-index: 99;
  position: sticky;
  top: 0px;
  margin: 0 auto;
  height: var(--header-cover-sticky-height);

  Button {
    background-color: var(--mi-normal-background-color);
  }

  @media screen and (max-width: ${bp.medium}px) {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding: var(--mi-side-paddings-xsmall);
    position: sticky;
    top: 0;
  }
`;

const Header = () => {
  const { state } = useGlobalStateContext();
  const isLoggedIn = !!state.user?.id;

  const { artistId, trackGroupId } = useParams();

  const { object: artist } = usePublicArtist<Artist>("artists", artistId);

  const artistBanner = artist?.banner?.sizes;

  const show = useShow();

  if (!isLoggedIn) {
    return (
      <HeaderWrapper transparent show={show}>
        <Content>
          <div />
          <LogInPopup />
        </Content>
      </HeaderWrapper>
    );
  }

  return (
    <HeaderWrapper
      transparent={!!artistBanner && !!artistId}
      artistBanner={!!artistBanner}
      show={show}
      trackGroupId={!!trackGroupId}
      artistId={!!artistId}
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
      <Content artistId={artistId}>
        <LogoWrapper />
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
      </Content>
    </HeaderWrapper>
  );
};

export default Header;
