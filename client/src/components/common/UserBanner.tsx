import { useLocation, useParams } from "react-router-dom";
import {
  BannerWrapper,
  StretchedImage,
  TiledImage,
  NoMargin,
} from "./ArtistBanner";
import { queryLabelBySlug } from "queries";
import { useQuery } from "@tanstack/react-query";

const UserBanner = () => {
  const { pathname } = useLocation();

  const isManage = pathname.includes("manage");
  const isLabel = pathname.startsWith("/label/");
  const { labelSlug } = useParams();

  const { data: label } = useQuery(queryLabelBySlug(labelSlug));

  const banner = label?.banner;
  console.log("label", label);
  console.log("banner", banner);

  const showBanner = isLabel;

  return (
    <>
      {banner && showBanner && (
        <BannerWrapper>
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
        </BannerWrapper>
      )}
      {(!banner || !showBanner) && <NoMargin />}
    </>
  );
};

export default UserBanner;
