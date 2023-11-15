import React from "react";
import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { bp } from "../../constants";
import IconButton from "./IconButton";
import ReactDOM from "react-dom";
import Background from "./Background";
import { FaTimes } from "react-icons/fa";

const wrapper = css`
  position: fixed;
  pointer-events: none;
  z-index: 12;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
`;

type ContentProps = {
  size?: "small";
};

const Content = styled.div<ContentProps>`
  pointer-events: auto;
  background-color: var(--mi-normal-background-color);
  position: absolute;
  top: 20%;
  left: 0;
  right: 0;
  overflow-y: scroll;
  margin: 0 auto;
  max-height: 600px;
  padding: 20px;
  z-index: 999;
  border: 1px solid var(--mi-darken-background-color);
  display: flex;
  flex-direction: column;
  width: ${(props) => (props.size === "small" ? "40%" : "80%")};
  animation: 300ms ease-out forwards slide-up;
  border-radius: var(--mi-border-radius);

  h1 {
    display: inline-block;
  }

  @media (max-width: ${bp.medium}px) {
    width: 90%;
  }
`;

const close = css`
  color: #aaa;
  float: right;
  border: none;
  background: none;
  cursor: pointer;
  margin-bottom: 0.25rem;
  font-size: 1rem !important

  &:hover,
  &:focus {
    text-decoration: none;
  }
`;

export const Modal: React.FC<{
  open: boolean;
  children: React.ReactNode;
  title?: string;
  onClose: () => void;
  size?: "small";
}> = ({ children, open, onClose, size, title }) => {
  const [container] = React.useState(() => {
    // This will be executed only on the initial render
    // https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
    return document.createElement("div");
  });
  React.useEffect(() => {
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  const onCloseWrapper = React.useCallback(
    (
      e:
        | React.MouseEvent<HTMLButtonElement, MouseEvent>
        | React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => {
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  if (!open) {
    return null;
  }

  return ReactDOM.createPortal(
    <>
      <Background onClick={onCloseWrapper} />
      <div className={wrapper} data-cy="modal">
        <Content size={size}>
          <div
            className={css`
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 1rem;
            `}
          >
            {title && <h2>{title}</h2>}

            <IconButton
              className={close}
              compact
              onClick={onCloseWrapper}
              aria-label="close"
            >
              <FaTimes />
            </IconButton>
          </div>
          {children}
        </Content>
      </div>
    </>,
    container
  );
};

export default Modal;
