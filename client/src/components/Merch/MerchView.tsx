import { css } from "@emotion/css";

import { useParams } from "react-router-dom";
import Box from "../common/Box";
import { useTranslation } from "react-i18next";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import { MetaCard } from "components/common/MetaCard";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";

import { bp } from "../../constants";

import MarkdownContent from "components/common/MarkdownContent";
import WidthContainer from "components/common/WidthContainer";
import { ItemViewTitle } from "../TrackGroup/TrackGroupTitle";
import SupportArtistPopUp from "components/common/SupportArtistPopUp";

import { useQuery } from "@tanstack/react-query";
import { queryArtist, queryMerch, queryUserStripeStatus } from "queries";
import {
  ImageAndDetailsWrapper,
  ImageWrapper,
} from "components/TrackGroup/TrackGroup";
import BuyMerchItem from "./BuyMerchItem";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import { ButtonLink } from "components/common/Button";
import { getArtistManageMerchUrl } from "utils/artist";
import { FaPen } from "react-icons/fa";

function TrackGroup() {
  const { t } = useTranslation("translation", {
    keyPrefix: "merchDetails",
  });

  const { artistId, merchId } = useParams();
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const { data: merch, isLoading: isLoadingMerch } = useQuery(
    queryMerch({ merchId: merchId ?? "" })
  );

  const { data: stripeAccountStatus } = useQuery(
    queryUserStripeStatus(artist?.userId ?? 0)
  );

  if (!artist && !isLoadingArtist) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!artist) {
    return <FullPageLoadingSpinner />;
  }

  if (!merch && !isLoadingMerch) {
    return <Box>{t("doesNotExist")}</Box>;
  } else if (!merch) {
    return <FullPageLoadingSpinner />;
  }

  return (
    <WidthContainer variant="big" justify="center">
      <MetaCard
        title={merch.title}
        description={`Merch by ${merch.artist?.name ?? "an artist"} on Mirlo`}
        image={merch.images?.[0]?.sizes?.[600]}
      />
      <div
        className={css`
          width: 100%;
          align-items: center;

          td {
            padding: 0rem 0.4rem 0rem 0rem !important;
            margin: 0.1rem 0rem !important;
          }

          a {
            color: ${artist.properties?.colors.primary};
          }

          @media screen and (max-width: ${bp.small}px) {
            td {
              padding: 0.2rem 0.1rem 0.2rem 0rem !important;
            }
          }
        `}
      >
        <div
          className={css`
            display: flex;
            flex-direction: column;
            justify-content: center;

            @media screen and (max-width: ${bp.small}px) {
              padding-top: 0px;
            }
          `}
        >
          <SpaceBetweenDiv>
            <ItemViewTitle title={merch.title} />
            <ButtonLink
              compact
              startIcon={<FaPen />}
              variant="dashed"
              to={getArtistManageMerchUrl(artist.id, merch.id)}
            >
              {t("editMerch")}
            </ButtonLink>
          </SpaceBetweenDiv>
          <div
            className={css`
              display: flex;
              justify-content: space-between;
              flex-wrap: nowrap;

              @media screen and (max-width: ${bp.small}px) {
                flex-direction: column;
              }
            `}
          >
            <ImageAndDetailsWrapper>
              <ImageWrapper>
                <ImageWithPlaceholder
                  src={
                    merch.images?.[0]?.sizes?.[960] +
                    "?" +
                    merch.images?.[0].updatedAt
                  }
                  alt={merch.title}
                  size={960}
                />
              </ImageWrapper>
            </ImageAndDetailsWrapper>
            <div
              className={css`
                margin-left: 1rem;
                max-width: 59%;
                flex: 59%;
                @media screen and (max-width: ${bp.small}px) {
                  max-width: 100%;
                  flex: 100%;
                  margin-left: 0;
                }
              `}
            >
              <MarkdownContent content={merch.description} />
            </div>
            <BuyMerchItem />
          </div>
        </div>

        <div
          className={css`
            margin-top: 4rem;
            text-align: center;
          `}
        >
          {merch.artist && stripeAccountStatus?.chargesEnabled && (
            <SupportArtistPopUp artist={merch.artist} />
          )}
        </div>
      </div>
    </WidthContainer>
  );
}

export default TrackGroup;
