import React from "react";
import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { bp } from "../../constants";
import IconButton from "./IconButton";
import ReactDOM from "react-dom";
import Background from "./Background";
import { FaTimes } from "react-icons/fa";
import HeaderDiv from "./HeaderDiv";

const wrapper = css`
  position: fixed;
  pointer-events: none;
  z-index: 999;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  align-items: center;
`;

type ContentProps = {
  size?: "small";
};

const Content = styled.div<ContentProps>`
  pointer-events: auto;
  background-color: var(--mi-normal-background-color);
  position: absolute;
  left: 0;
  right: 0;
  overflow-y: auto;
  max-width: 1080px;
  margin: 0 auto;
  max-height: calc(100vh - 80px);
  padding: 20px;
  padding-top: 0;
  border: 1px solid var(--mi-darken-background-color);
  display: flex;
  flex-direction: column;
  width: ${(props) => (props.size === "small" ? "40%" : "80%")};

  animation: 300ms ease-out forwards slide-up;
  border-radius: var(--mi-border-radius-x);

  ::-webkit-scrollbar {
    width: 3px;
  }
  ::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
    border-radius: 5px;
  }
  ::-webkit-scrollbar-thumb {
    border-radius: 5px;
    -webkit-box-shadow: inset 0 0 6px;
  }

  h1 {
    display: inline-block;
  }

  @media (max-width: ${bp.small}px) {
    width: 100%;
    padding: 1rem;
    min-height: calc(90vh - 80px);
    padding-top: 0;
    bottom: 0;
    border-radius: var(--mi-border-radius-focus) var(--mi-border-radius-focus) 0
      0;
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
          <HeaderDiv
            className={css`
            position: sticky;
            top: 0;
            padding-top: 1rem;
            margin-bottom: .5rem;
            background-color: inherit;
            border-bottom: solid 1px var(--mi-light-foreground-color);
            z-index: +1;

            h2 {
              margin-bottom: 0;
              font-weight: bold;
            }
              }
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
          </HeaderDiv>
          {children}
        </Content>
      </div>
    </>,
    container
  );
};

export default Modal;
