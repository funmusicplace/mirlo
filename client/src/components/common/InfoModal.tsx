import { FaQuestionCircle } from "react-icons/fa";
import Button from "./Button";
import React from "react";
import Modal from "./Modal";
import { css } from "@emotion/css";

const InfoModal: React.FC<{ info: React.ReactElement | string }> = ({
  info,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      <Button
        onlyIcon
        startIcon={<FaQuestionCircle />}
        onClick={() => setIsOpen(true)}
        className={css`
          background-color: transparent !important;
          cursor: help;
          text-decoration: dashed;
          text-decoration-line: underline !important;
          text-decoration-color: black !important;
          text-decoration: underline !important;
        `}
      />{" "}
      <Modal onClose={() => setIsOpen(false)} open={isOpen}>
        {info}
      </Modal>
    </>
  );
};

export default InfoModal;
