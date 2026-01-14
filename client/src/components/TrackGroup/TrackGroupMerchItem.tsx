import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Button from "components/common/Button";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import Modal from "components/common/Modal";
import { moneyDisplay } from "components/common/Money";
import BuyMerchItem from "components/Merch/BuyMerchItem";
import MerchButtonPopUp from "components/Merch/MerchButtonPopUp";
import { bp } from "../../constants";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import { Link, useParams } from "react-router-dom";
import { getMerchUrl } from "utils/artist";

const TrackGroupMerchItem: React.FC<{ item: Merch }> = ({ item }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });

  const { artistId } = useParams();
  const { data: artist, isLoading: isLoadingArtist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );

  if (isLoadingArtist || !artist) {
    return <LoadingBlocks />;
  }

  return (
    <div
      className={css`
        padding: 0.5rem !important;
      `}
    >
      <li key={item.id}>
        <ImageWithPlaceholder
          src={item.images?.[0]?.sizes?.[60]}
          alt={item.title}
          size={60}
          square
          objectFit="contain"
        />
        <div
          className={css`
            display: flex;
            align-items: center;
            > a {
              margin-left: 1rem;
              font-size: 0.9rem;
            }

            img {
              height: 60px;
            }

            @media (max-width: ${bp.medium}px) {
              justify-content: center;
              width: 75%;
              flex-wrap: wrap;
              margin-left: 0.5rem !important;

              button {
                width: 100%;
              }
              > a {
                margin: 0rem;
                padding-bottom: 0.5rem;
                font-size: 0.9rem;
              }
            }
          `}
        >
          <Link to={getMerchUrl(artist, item)}>{item.title}</Link>
          <MerchButtonPopUp artist={artist} merch={item} />
        </div>
      </li>
    </div>
  );
};

export default TrackGroupMerchItem;
