import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import Pill from "components/common/Pill";
import SectionActionStrip from "components/common/SectionActionStrip";
import { queryManagedArtist, queryManagedArtistMerch } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaEye, FaPen, FaTags } from "react-icons/fa";
import { ImWarning } from "react-icons/im";
import { useParams } from "react-router-dom";
import { getMerchUrl } from "utils/artist";

import ManageSectionWrapper from "../ManageSectionWrapper";

import DashedList from "./DashedList";
import MerchFulfillmentLink from "./MerchFulfillmentLink";
import { NewMerchButton } from "./NewMerchButton";

const ManageMerch: React.FC<{}> = () => {
  const { artistId } = useParams();
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const { t: tArtist } = useTranslation("translation", {
    keyPrefix: "manageArtist",
  });

  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryManagedArtist(Number(artistId))
  );
  const { data: merch, isLoading } = useQuery(
    queryManagedArtistMerch({ artistId: Number(artistId) })
  );

  if (isLoading || isLoadingArtist) {
    return <LoadingBlocks />;
  }

  if (!artist) {
    return null;
  }

  return (
    <ManageSectionWrapper>
      <SectionActionStrip>
        <ArtistButtonLink
          to={`/manage/artists/${artistId}/pricing`}
          size="compact"
          startIcon={<FaTags />}
          variant="dashed"
          collapsible
        >
          {tArtist("bulkPricing")}
        </ArtistButtonLink>
        <NewMerchButton artist={artist} />
      </SectionActionStrip>
      <DashedList>
        {artist &&
          merch?.results.map((item) => {
            const cover = item.images?.[0]?.sizes?.[60];
            return (
              <li key={item.id}>
                <div
                  className={css`
                    display: flex;
                    align-items: center;

                    > span {
                      margin-left: 1rem;
                    }

                    ${!cover
                      ? `&:first-child {
                    max-width: 60px;
                  }`
                      : ""}
                  `}
                >
                  <ImageWithPlaceholder
                    src={item.images?.[0]?.sizes?.[60]}
                    alt={item.title}
                    size={60}
                    square
                    objectFit="contain"
                  />
                  <span>{item.title}</span>
                  {!item.isPublic && (
                    <Pill variant="warning">
                      <ImWarning />
                      {t("notPublic")}
                    </Pill>
                  )}
                </div>
                <div>{item.catalogNumber}</div>
                <div
                  className={css`
                    display: flex;
                    gap: 0.5rem;
                  `}
                >
                  <ArtistButtonLink
                    to={getMerchUrl(artist, item)}
                    startIcon={<FaEye />}
                  />
                  <ArtistButtonLink to={item.id} startIcon={<FaPen />} />
                </div>
              </li>
            );
          })}
      </DashedList>

      <MerchFulfillmentLink />
    </ManageSectionWrapper>
  );
};

export default ManageMerch;
