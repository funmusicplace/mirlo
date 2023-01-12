import React from "react";
import { FaChevronLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import IconButton from "./IconButton";

export const BackButton = () => {
  const navigate = useNavigate();
  const onBackClick = React.useCallback(() => {
    navigate("/");
  }, [navigate]);

  return (
    <IconButton onClick={onBackClick}>
      <FaChevronLeft />
    </IconButton>
  );
};

export default BackButton;
