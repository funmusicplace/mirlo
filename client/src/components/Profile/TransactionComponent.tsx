import React from "react";
import { Trans, useTranslation } from "react-i18next";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import { moneyDisplay } from "components/common/Money";
import { Link } from "react-router-dom";
import { getArtistUrl } from "utils/artist";
import { formatDate } from "components/TrackGroup/ReleaseDate";
import { css } from "@emotion/css";
import { Button } from "components/common/Button";
import Tooltip from "components/common/Tooltip";
import Modal from "components/common/Modal";
import MerchPopUp from "./MerchPopUp";

const MerchPurchaseDetails: React.FC<{
  merchPurchase: MerchPurchase;
}> = ({ merchPurchase }) => {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "profile" });
  const [isViewingMerchPopUp, setIsViewingMerchPopUp] = React.useState(false);

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        gap: 0.5rem;
      `}
    >
      <Tooltip hoverText={t("theStatusOfThisMerchFulfillment")}>
        {t(merchPurchase.fulfillmentStatus.toLowerCase())}
      </Tooltip>
      <Button onClick={() => setIsViewingMerchPopUp(true)}>
        {t("viewDetails")}
      </Button>
      <Modal
        open={isViewingMerchPopUp}
        onClose={() => setIsViewingMerchPopUp(false)}
        title={t("purchaseDetails")}
      >
        <MerchPopUp purchase={merchPurchase} />
      </Modal>
    </div>
  );
};

const TransactionComponent: React.FC<{
  userTransaction: UserTransaction;
}> = ({ userTransaction }) => {
  const { t, i18n } = useTranslation("translation", { keyPrefix: "profile" });
  console.log("userTransaction", userTransaction);
  const isTrackGroupPurchase = !!userTransaction.trackGroupPurchases?.length;
  const isMerchPurchase = !!userTransaction.merchPurchases?.length;
  const isTrackPurchase = !!userTransaction.trackPurchases?.length;

  const imageSrc = isTrackGroupPurchase
    ? userTransaction.trackGroupPurchases?.[0]?.trackGroup?.cover?.sizes?.[60]
    : isMerchPurchase
      ? userTransaction.merchPurchases?.[0]?.merch?.images?.[0]?.sizes?.[60]
      : isTrackPurchase
        ? userTransaction.trackPurchases?.[0]?.track?.trackGroup?.cover
            ?.sizes?.[60]
        : undefined;
  const title = isTrackGroupPurchase
    ? userTransaction.trackGroupPurchases?.[0]?.trackGroup?.title
    : isMerchPurchase
      ? userTransaction.merchPurchases?.[0]?.merch?.title
      : isTrackPurchase
        ? userTransaction.trackPurchases?.[0]?.track?.title
        : undefined;
  const artist = isTrackGroupPurchase
    ? userTransaction.trackGroupPurchases?.[0]?.trackGroup?.artist
    : isMerchPurchase
      ? userTransaction.merchPurchases?.[0]?.merch?.artist
      : isTrackPurchase
        ? userTransaction.trackPurchases?.[0]?.track?.trackGroup?.artist
        : undefined;
  const url = isTrackGroupPurchase
    ? `/${artist?.urlSlug}/release/${userTransaction.trackGroupPurchases?.[0]?.trackGroup?.urlSlug}`
    : isMerchPurchase
      ? `/${artist?.urlSlug}/merch/${userTransaction.merchPurchases?.[0]?.merch?.urlSlug}`
      : isTrackPurchase
        ? `/${artist?.urlSlug}/release/${userTransaction.trackPurchases?.[0]?.track?.trackGroup?.urlSlug}/tracks/${userTransaction.trackPurchases?.[0]?.track?.urlSlug ?? userTransaction.trackPurchases?.[0]?.track?.id}`
        : "#";

  return (
    <>
      <div
        className={css`
          display: flex;
          align-items: center;

          > div {
            margin-right: 1rem;
          }
        `}
      >
        {imageSrc && (
          <div>
            <ImageWithPlaceholder alt={title ?? ""} size={50} src={imageSrc} />
          </div>
        )}
        <div>
          {artist && (
            <Trans
              t={t}
              i18nKey="albumLink"
              values={{ albumTitle: title, artistName: artist.name }}
              components={{
                albumLink: <Link to={url}></Link>,
                artistLink: <Link to={getArtistUrl(artist)}></Link>,
              }}
            />
          )}
          <div
            className={css`
              margin-top: 0.2rem;
              color: var(--mi-lighter-foreground-color);
              font-style: italic;
            `}
          >
            {t("purchasedOn", {
              date: formatDate({
                date: userTransaction.createdAt,
                i18n,
                options: { day: "numeric", month: "long", year: "numeric" },
              }),
            })}
          </div>
        </div>
      </div>
      {isMerchPurchase && userTransaction.merchPurchases?.[0] && (
        <MerchPurchaseDetails
          merchPurchase={userTransaction.merchPurchases?.[0]}
        />
      )}
      <span>
        {t("paid", {
          amount: moneyDisplay({
            amount: userTransaction.amount / 100,
            currency: userTransaction.currency,
          }),
        })}
      </span>
    </>
  );
};

export default TransactionComponent;
