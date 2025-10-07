import { css } from "@emotion/css";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { WidthWrapper } from "components/common/WidthContainer";

type MessageKey =
  | "generic"
  | "userCanceled"
  | "abandoned"
  | "paymentFailed"
  | "expired";

const REASON_TRANSLATION_MAP: Record<string, MessageKey> = {
  user_canceled: "userCanceled",
  abandoned: "abandoned",
  expired: "expired",
  failed: "paymentFailed",
  failed_invoice: "paymentFailed",
  void_invoice: "paymentFailed",
  declined: "paymentFailed",
  duplicate: "paymentFailed",
  fraudulent: "paymentFailed",
  expired_card: "paymentFailed",
  lost_card: "paymentFailed",
  stolen_card: "paymentFailed",
  testmode_payment_canceled: "paymentFailed",
};

const DEFAULT_MESSAGE_KEY: MessageKey = "generic";

type RouteParams = {
  artistId?: string;
};

function CheckoutError() {
  const { t } = useTranslation("translation", { keyPrefix: "checkoutError" });
  const [searchParams] = useSearchParams();
  const { artistId } = useParams<RouteParams>();

  const reason = (searchParams.get("reason") ?? "").toLowerCase();
  const messageKey = REASON_TRANSLATION_MAP[reason] ?? DEFAULT_MESSAGE_KEY;
  const homePath = useMemo(
    () => (artistId ? `/${encodeURIComponent(artistId)}` : "/"),
    [artistId]
  );

  return (
    <WidthWrapper
      variant="small"
      className={css`
        margin-top: 4rem !important;
        text-align: center;

        h1 {
          margin-bottom: 1.5rem;
        }

        p {
          margin-bottom: 2rem;
        }

        a {
          color: var(--color-primary);
          font-weight: 600;
        }
      `}
    >
      <h1>{t("title")}</h1>
      <p>{t(messageKey)}</p>
      <Link to={homePath}>{t("returnHome")}</Link>
    </WidthWrapper>
  );
}

export default CheckoutError;
