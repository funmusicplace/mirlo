import { useRef } from "react";
import { Link, useParams } from "react-router-dom";
import usePublicArtist from "utils/usePublicObjectById";
import PageBanner from "components/common/ArtistBanner";
import { bp } from "../../constants";
import HeaderSearch from "./HeaderSearch";
import Logo from "components/common/Logo";
import { ImMenu } from "react-icons/im";
import styled from "@emotion/styled";
import useShow from "utils/useShow";
import LogInPopup from "./LogInPopup";
import { useAuthContext } from "state/AuthContext";
import Button, { ButtonLink } from "components/common/Button";
import { useTranslation } from "react-i18next";
import { FaHandHoldingHeart } from "react-icons/fa";
import { queryInstanceArtist } from "queries/settings";
import { useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { getArtistUrl } from "utils/artist";
import UserBanner from "components/common/UserBanner";
import Menu from "components/Header/Menu";

const HeaderWrapper = styled.div<{
  artistBanner?: boolean;
  transparent?: boolean;
  artistId?: boolean;
  show?: string;
  trackGroupId?: boolean;
  colors?: {
    primary?: string;
    secondary?: string;
    foreground?: string;
    background?: string;
  };
}>`
  position: sticky;
  width: 100%;
  z-index: 999;
  transition: top 0.4s ease-out;

  ${(props) =>
    props.show === "up"
      ? `top: 0;
           transition: top 0.4s ease-out;`
      : ""}
  ${(props) =>
    props.show === "down"
      ? `top: -60px;
           transition: top 0.4s ease-out;`
      : ""}

  ${(props) =>
    props.transparent
      ? `background: transparent; 
         box-shadow: 0px 1px 10px rgba(0, 0, 0, 0);`
      : `background: var(--mi-normal-background-color); 
         box-shadow: 0px 1px 5px rgba(0, 0, 0, 0.1);`}

  ${(props) =>
    props.trackGroupId
      ? `background-color: var(--mi-normal-background-color) !important; 
         box-shadow: 0px 1px 5px rgba(0, 0, 0, 0.1) !important;`
      : ""}

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
  }
`;

const LogoWrapper = () => {
  return (
    <Link
      to="/"
      aria-label="Mirlo"
      className="mt-[-.1rem] leading-none font-size-[1.5rem] flex justify-start items-center"
    >
      <span aria-hidden className="max-md:hidden">
        <Logo />
      </span>
      <span aria-hidden className="md:hidden">
        <Logo noWordmark />
      </span>
    </Link>
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
  z-index: 999;
  position: sticky;
  top: 0px;
  margin: 0 auto;
  height: var(--header-cover-sticky-height);

  @media screen and (max-width: ${bp.medium}px) {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding: var(--mi-side-paddings-xsmall);
    position: sticky;
    top: 0;
  }
`;

const Header = () => {
  const { t } = useTranslation();

  const { user } = useAuthContext();
  const isLoggedIn = !!user?.id;

  const { artistId, trackGroupId } = useParams();

  const { object: artist } = usePublicArtist<Artist>("artists", artistId);
  const artistBanner = artist?.banner?.sizes;
  const colors = artist?.properties?.colors;

  const show = useShow();
  const transparent = !!artistBanner && !!artistId;

  const { data: instanceArtist } = useQuery(queryInstanceArtist());

  const menuRef = useRef<HTMLDialogElement | null>(null);
  const menuButtonId = "menu-button";
  const menuDialogId = "menu-dialog";

  const openMenu = () => {
    if (menuRef.current) {
      menuRef.current.showModal();
    }
  };

  const closeMenu = () => {
    if (menuRef.current) {
      menuRef.current.close();
    }
  };

  return (
    <HeaderWrapper
      transparent={transparent}
      artistBanner={!!artistBanner}
      show={show}
      trackGroupId={!!trackGroupId}
      artistId={!!artistId}
      colors={colors}
    >
      <div className="md:hidden!">
        <PageBanner />
        <UserBanner />
      </div>
      <div className="absolute w-full h-full md:hidden!"></div>
      <Content artistId={artistId}>
        <LogoWrapper />
        <div className="flex items-center">
          <HeaderSearch />
          {instanceArtist && (
            <ButtonLink
              to={getArtistUrl(instanceArtist) + "/support"}
              collapsible
              startIcon={<FaHandHoldingHeart />}
              className="block me-[.75rem] no-underline text-center hover:underline! color-white! &_svg:fill-white! bg-black! max-md:font-size-(--mi-font-size-xsmall)!"
            >
              <p>{t("donateNow", { keyPrefix: "kickstarter" })}</p>
            </ButtonLink>
          )}
          {!isLoggedIn && <LogInPopup />}
          {isLoggedIn && (
            <Button
              aria-controls={menuDialogId}
              command="show-modal"
              commandfor={menuDialogId}
              id={menuButtonId}
              onClick={() => openMenu()}
              startIcon={<ImMenu />}
            >
              Menu
            </Button>
          )}
          {isLoggedIn &&
            createPortal(
              <Menu
                buttonId={menuButtonId}
                dialogId={menuDialogId}
                isAdmin={user.isAdmin}
                isLabelAccount={user.isLabelAccount}
                onClose={() => closeMenu()}
                ref={menuRef}
              />,
              document.body
            )}
        </div>
      </Content>
    </HeaderWrapper>
  );
};

export default Header;
