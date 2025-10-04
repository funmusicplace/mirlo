import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import { WidthWrapper } from "components/common/WidthContainer";

type MessageKey = "generic" | "userCanceled";

const REASON_TRANSLATION_MAP: Record<string, MessageKey> = {
  user_canceled: "userCanceled",
};

const DEFAULT_MESSAGE_KEY: MessageKey = "generic";

function CheckoutError() {
  const { t } = useTranslation("translation", { keyPrefix: "checkoutError" });
  const [searchParams] = useSearchParams();

  const reason = searchParams.get("reason") ?? "";
  const messageKey = REASON_TRANSLATION_MAP[reason] ?? DEFAULT_MESSAGE_KEY;

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
      <Link to="/">{t("returnHome")}</Link>
    </WidthWrapper>
  );
}

export default CheckoutError;
