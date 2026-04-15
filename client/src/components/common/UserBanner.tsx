import { useLocation, useParams } from "react-router-dom";
import {
  BackgroundWrapper,
  StretchedImage,
  TiledImage,
  NoMargin,
} from "./ArtistBackground";
import { queryLabelBySlug } from "queries";
import { useQuery } from "@tanstack/react-query";

const UserBanner = () => {
  const { pathname } = useLocation();

  const isLabel = pathname.startsWith("/label/");
  const { labelSlug } = useParams();

  const { data: label } = useQuery(queryLabelBySlug(labelSlug));

  const banner = label?.banner;

  const showBanner = isLabel;

  return (
    <>
      {banner && showBanner && (
        <BackgroundWrapper>
          {banner && !label.properties?.tileBackgroundImage && (
            <StretchedImage
              src={banner?.sizes?.[2500] + `?${banner?.updatedAt}`}
              alt="Profile banner"
            />
          )}
          {banner && label.properties?.tileBackgroundImage && (
            <TiledImage
              url={`${banner.sizes?.original}?${banner?.updatedAt}`}
            />
          )}
        </BackgroundWrapper>
      )}
      {(!banner || !showBanner) && <NoMargin />}
    </>
  );
};

export default UserBanner;
