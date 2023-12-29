import Button from "components/common/Button";
import LogInForm from "components/common/LogInForm";
import Modal from "components/common/Modal";
import React from "react";
import { FaUserAlt } from "react-icons/fa";

const LogInPopup = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <>
      <Button
        onlyIcon
        startIcon={<FaUserAlt />}
        onClick={() => setIsOpen((val) => !val)}
      />
      <Modal open={isOpen} onClose={() => setIsOpen(false)} size="small">
        <LogInForm afterLogIn={() => setIsOpen(false)} />
      </Modal>
    </>
  );
};

export default LogInPopup;
