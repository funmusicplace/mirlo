import styled from "@emotion/styled";
import SnackbarContext, { Variant } from "state/SnackbarContext";
import React from "react";
import { bp } from "../../constants";

const Container = styled.div<{ variant: Variant }>`
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => {
    if (props.variant === "success") {
      return props.theme.colors.success
    } else if (props.variant === "warning") {
      return props.theme.colors.warning
    } else {
      return props.theme.colors.background
    }
  }};
  color: #fff;
  z-index: 1000;
  margin: 16px;
  border-radius: 4px;
  min-width: 344px;
  max-width: 672px;
  box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.2),
    0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12);
  padding: 8px;
  animation: 300ms ease-out forwards slide-up;
  overflow: hidden;

  @media (max-width: ${bp.small}px) {
    bottom: auto;
    top: 3rem;
    left: 1rem;
  }
`;

const Label = styled.div`
  line-height: 1.2rem;
  padding-left: 16px;
  padding-right: 8px;
  width: 100%;
  margin: 0;
  padding-top: 14px;
  padding-bottom: 14px;
`;

const Dismiss = styled.div`
  font-size: 120%;
  font-weight: bold;
  margin-left: 8px;
  margin-right: 8px;
  cursor: pointer;
  padding: 8px;
`;

const Snackbar: React.FC = () => {
  const snackbarCtx = React.useContext(SnackbarContext);
  return (
    <Container variant={snackbarCtx.variant}>
      <Label>{snackbarCtx.msg}</Label>
      <Dismiss onClick={snackbarCtx.onClose}>&times;</Dismiss>
    </Container>
  );
};

export default Snackbar;
