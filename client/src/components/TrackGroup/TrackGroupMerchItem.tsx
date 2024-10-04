import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import Button from "components/common/Button";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import Modal from "components/common/Modal";
import { moneyDisplay } from "components/common/Money";
import BuyMerchItem from "components/Merch/BuyMerchItem";
import { queryArtist } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronRight } from "react-icons/fa";
import { useParams } from "react-router-dom";

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

          > span {
            margin-left: 1rem;
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
        <span>{item.title}</span>
      </div>

      <Button
        endIcon={<FaChevronRight />}
        // to={`/${item.artistId}/merch/${item.id}`}
        onClick={() => setIsOpen(true)}
      >
        {t("buyFor", {
          amount: moneyDisplay({
            amount: item.minPrice,
            currency: item.currency,
          }),
        })}
      </Button>
      <Modal
        open={isOpen}
        size="small"
        onClose={() => setIsOpen(false)}
        className={css`
          form {
            max-width: 100%;
            background-color: transparent;
          }
        `}
      >
        <BuyMerchItem artist={artist} merch={item} />
      </Modal>
    </li>
  );
};

export default TrackGroupMerchItem;
