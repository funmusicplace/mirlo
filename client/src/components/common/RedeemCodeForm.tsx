import { css } from "@emotion/css";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";

const RedeemCodeForm: React.FC<{
  onRedeem: (code: string, email: string) => void;
}> = ({ onRedeem }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "trackGroupDetails",
  });
  const { user } = useAuthContext();
  const [params] = useSearchParams();
  const [code, setCode] = React.useState(params.get("code") ?? "");
  const [email, setEmail] = React.useState("");

  return (
    <FormComponent
      className={css`
        margin-top: 2rem !important;

        label {
          font-size: 1.25rem !important;
        }

        input {
          max-width: 300px;
        }
      `}
    >
      <label htmlFor="redeem-code">{t("enterDownloadCode")}</label>
      <InputEl
        id="redeem-code"
        className={css`
          margin-bottom: 1rem;
        `}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      {!user && (
        <FormComponent>
          <label htmlFor="redeem-email">{t("yourEmail")}</label>
          <InputEl
            id="redeem-email"
            className={css`
              margin-bottom: 1rem;
            `}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormComponent>
      )}
      <ArtistButton onClick={() => onRedeem(code, email)}>
        {t("redeem")}
      </ArtistButton>
    </FormComponent>
  );
};

export default RedeemCodeForm;
