import { css } from "@emotion/css";

import { Link, useParams } from "react-router-dom";
import Box from "../common/Box";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { MetaCard } from "components/common/MetaCard";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

import { bp } from "../../constants";

import MarkdownContent from "components/common/MarkdownContent";
import WidthContainer from "components/common/WidthContainer";
import { ItemViewTitle } from "../TrackGroup/ItemViewTitle";
import SupportArtistPopUp from "components/common/SupportArtistPopUp";

import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryMerch, queryUserStripeStatus } from "queries";
import {
  ImageAndDetailsWrapper,
  ImageWrapper,
} from "components/TrackGroup/TrackGroup";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { getArtistManageMerchUrl, getReleaseUrl } from "utils/artist";
import { FaDownload, FaPen } from "react-icons/fa";
import { useAuthContext } from "state/AuthContext";
import PublicTrackGroupListing from "components/common/TrackTable/PublicTrackGroupListing";

import MerchButtonPopUp from "./MerchButtonPopUp";
import {
  ArtistButtonAnchor,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";

const MerchDownloadableContent: React.FC<{ merch: Merch; artist: Artist }> = ({
  merch,
  artist,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });

  const { user } = useAuthContext();

  console.log("user", user);

  const userIsOwner = user?.id === artist.userId || user?.isAdmin;

  const userHasPurchasedMerch = user?.merchPurchase?.some(
    (m) => m.merchId === merch.id
  );

  if (userHasPurchasedMerch || userIsOwner) {
    return merch.downloadableContent && merch.downloadableContent.length > 0 ? (
      <div
        className={css`
          margin: 1.5rem 1rem 0 1rem;
          @media screen and (max-width: ${bp.small}px) {
            max-width: 100%;
            flex: 100%;
            margin-left: 0;
          }
        `}
      >
        <p>
          <strong>{t("yourPurchaseIncludes")}</strong>
        </p>
        <ul
          className={css`
            list-style-type: disc;
            margin-top: 0.5rem;
            margin-left: 1.5rem;
          `}
        >
          {merch.downloadableContent.map((content) => (
            <li key={content.downloadableContentId}>
              <ArtistButtonAnchor
                href={content.downloadableContent.downloadUrl}
                target="_blank"
                rel="noreferrer"
                variant="link"
                endIcon={<FaDownload />}
              >
                {content.downloadableContent.originalFilename}
              </ArtistButtonAnchor>
            </li>
          ))}
        </ul>
      </div>
    ) : null;
  }

  return (
    <>
      {merch.downloadableContent && merch.downloadableContent.length > 0 && (
        <div
          className={css`
            margin: 1.5rem 1rem 0 1rem;
            @media screen and (max-width: ${bp.small}px) {
              max-width: 100%;
              flex: 100%;
              margin-left: 0;
            }
          `}
        >
          <p>
            <strong>{t("purchaseIncludesThisDownloadableContent")}</strong>
          </p>
          <ul
            className={css`
              list-style-type: disc;
              margin-top: 0.5rem;
              margin-left: 1.5rem;
            `}
          >
            {merch.downloadableContent.map((content) => (
              <li key={content.downloadableContentId}>
                {content.downloadableContent.originalFilename}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

export default MerchDownloadableContent;
