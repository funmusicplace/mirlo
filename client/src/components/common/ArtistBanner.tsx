import { css } from "@emotion/css";
import { useLocation, useParams } from "react-router-dom";
import { bp } from "../../constants";
import useArtistQuery from "utils/useArtistQuery";
import styled from "@emotion/styled";

export const NoMargin = styled.div`
  @media screen and (max-width: ${bp.medium}px) {
    margin-top: 0px;
  }
`;

export const TiledImage = styled.div<{ url: string }>`
  width: 100%;
  height: 100%;
  background-image: url(${(props) => props.url});
  background-repeat: repeat;
  background-position: center;
  filter: brightness(0.8);
`;

export const StretchedImage = styled.img`
  width: 100%;
  z-index: -1;
  object-fit: cover;

  @media screen and (max-width: ${bp.medium}px) {
    object-fit: cover;
  }
`;

export const BannerWrapper = styled.div`
  position: fixed;
  height: 100%;
  width: 100%;
  overflow: hidden;
  display: flex;
  top: 0;
  justify-content: center;
  box-shadow: inset 1em -2em 0.8em -1.3em rgba(0, 0, 0, 0.4);
  @media screen and (max-width: ${bp.medium}px) {
    position: absolute;
    margin-top: 0px;
  }
`;

const ArtistBanner = () => {
  const { pathname } = useLocation();

  const isManage = pathname.includes("manage");
  const { trackGroupId, postId } = useParams();

  const { data: artist } = useArtistQuery();

  const artistBanner = artist?.banner;

  const showBanner = !(trackGroupId || postId) || isManage;

  return (
    <>
      {artistBanner && showBanner && (
        <BannerWrapper>
          {artistBanner && !artist.properties?.tileBackgroundImage && (
            <StretchedImage
              src={artistBanner?.sizes?.[2500] + `?${artistBanner?.updatedAt}`}
              alt="Artist banner"
            />
          )}
          {artistBanner && artist.properties?.tileBackgroundImage && (
            <TiledImage
              url={`${artistBanner.sizes?.original}?${artistBanner?.updatedAt}`}
            />
          )}
        </BannerWrapper>
      )}
      {(!artistBanner || !showBanner) && <NoMargin />}
    </>
  );
};

export default ArtistBanner;
