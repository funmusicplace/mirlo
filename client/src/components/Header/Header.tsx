import { css } from "@emotion/css";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import usePublicArtist from "utils/usePublicObjectById";
import PageHeader from "components/common/PageHeader";
import { bp } from "../../constants";
import HeaderSearch from "./HeaderSearch";
import Menu from "./Menu";
import Logo from "components/common/Logo";
import DropdownMenu from "components/common/DropdownMenu";
import { ImMenu } from "react-icons/im";
import styled from "@emotion/styled";
import useShow from "utils/useShow";
import LogInPopup from "./LogInPopup";
import { useAuthContext } from "state/AuthContext";
import { ButtonLink } from "components/common/Button";
import { useTranslation } from "react-i18next";
import { FaHandHoldingHeart } from "react-icons/fa";
import { queryInstanceArtist } from "queries/settings";
import { useQuery } from "@tanstack/react-query";
import { getArtistUrl } from "utils/artist";

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
           height: var(--header-cover-sticky-height); 
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
    <h1
      className={css`
        margin-top: -0.1rem;
        line-height: 0;
        font-size: 1.5rem;
      `}
    >
      <Link
        to="/"
        aria-label="Mirlo"
        className={css`
          display: flex;
          justify-content: flex-start;
          align-items: center;
        `}
      >
        <span
          aria-hidden
          className={css`
            @media (max-width: ${bp.medium}px) {
              display: none;
            }
          `}
        >
          <Logo />
        </span>
        <span
          aria-hidden
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
  const { t } = useTranslation("translation", { keyPrefix: "kickstarter" });

  const { user } = useAuthContext();
  const isLoggedIn = !!user?.id;

  const { artistId, trackGroupId } = useParams();

  const { object: artist } = usePublicArtist<Artist>("artists", artistId);
  const artistBanner = artist?.banner?.sizes;
  const colors = artist?.properties?.colors;

  const show = useShow();
  const transparent = !!artistBanner && !!artistId;

  const { data: instanceArtist } = useQuery(queryInstanceArtist());
  return (
    <HeaderWrapper
      transparent={transparent}
      artistBanner={!!artistBanner}
      show={show}
      trackGroupId={!!trackGroupId}
      artistId={!!artistId}
      colors={colors}
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
          `}
        >
          <HeaderSearch />

          {isLoggedIn && (
            <DropdownMenu icon={<ImMenu />}>
              <Menu />
            </DropdownMenu>
          )}
          {!isLoggedIn && <LogInPopup />}
          {instanceArtist && (
            <ButtonLink
              to={getArtistUrl(instanceArtist) + "/support"}
              collapsible
              startIcon={<FaHandHoldingHeart />}
              className={css`
                display: block;
                margin-left: 0.75rem;
                text-decoration: none;
                text-align: center;
                &:hover {
                  text-decoration: underline;
                }

                color: var(--mi-white) !important;

                svg {
                  fill: white !important;
                }

                background-color: var(--mi-black) !important;

                @media screen and (max-width: ${bp.medium}px) {
                  font-size: var(--mi-font-size-xsmall) !important;
                }
              `}
            >
              <p>{t("donateNow")}</p>
            </ButtonLink>
          )}
        </div>
      </Content>
    </HeaderWrapper>
  );
};

export default Header;
