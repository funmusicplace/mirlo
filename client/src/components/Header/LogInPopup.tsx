import { css } from "@emotion/css";
import Button from "components/common/Button";
import LogInForm from "components/common/LogInForm";
import Modal from "components/common/Modal";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaUserAlt } from "react-icons/fa";

const LogInPopup = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "logIn" });
  return (
    <>
      <Button
        onlyIcon
        startIcon={<FaUserAlt />}
        onClick={() => setIsOpen((val) => !val)}
        className={css`
          padding: 1rem;
        `}
      />
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size="small"
        title={t("logIn") ?? ""}
      >
        <LogInForm afterLogIn={() => setIsOpen(false)} />
      </Modal>
    </>
  );
};

export default LogInPopup;
