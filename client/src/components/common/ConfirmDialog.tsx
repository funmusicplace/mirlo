import { useConfirm } from "utils/useConfirm";
import Modal from "./Modal";
import { ArtistButton } from "components/Artist/ArtistButtons";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";

export const ConfirmDialog = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "confirmationDialog",
  });
  const { isAsking, message, deny, confirm } = useConfirm();

  return (
    <Modal open={isAsking} onClose={deny} size="small">
      <div>{message}</div>
      <div
        className={css`
          margin-top: 1.5rem;
          display: flex;

          justify-content: flex-end;

          button:first-of-type {
            margin-right: 0.5rem;
          }
        `}
      >
        <ArtistButton onClick={deny} variant="outlined">
          {t("cancel")}
        </ArtistButton>
        <ArtistButton onClick={confirm}>{t("yes")}</ArtistButton>
      </div>
    </Modal>
  );
};
