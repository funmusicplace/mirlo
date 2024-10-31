import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Button from "components/common/Button";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import Modal from "components/common/Modal";
import { moneyDisplay } from "components/common/Money";
import BuyMerchItem from "components/Merch/BuyMerchItem";
import MerchButtonPopUp from "components/Merch/MerchButtonPopUp";
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
    <li key={item.id}>
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
        `}
      >
        <ImageWithPlaceholder
          src={item.images?.[0]?.sizes?.[60]}
          alt={item.title}
          size={60}
          square
        />
        <Link to={getMerchUrl(artist, item)}>{item.title}</Link>
      </div>
      <MerchButtonPopUp artist={artist} merch={item} />
    </li>
  );
};

export default TrackGroupMerchItem;
