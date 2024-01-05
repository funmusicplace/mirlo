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

const ChildrenWrapper = styled.div<{ title?: boolean }>`
  overflow-y: auto;
  padding: 20px;
  margin-bottom: 1rem;
  margin-left: 0rem;
  ::-webkit-scrollbar {
    width: 2px;
  }
  ::-webkit-scrollbar-track {
    background-color: inset 0 0 0px rgba(0, 0, 0);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: grey;
  }

  h1 {
    display: inline-block;
  }
  I @media (max-width: ${bp.small}px) {
    margin-bottom: 0;
    padding: 1rem;
  }
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
  margin: 0 auto;
  max-height: calc(100vh - 150px);
  padding-top: 0;
  border: 1px solid var(--mi-darken-background-color);
  display: flex;
  flex-direction: column;
  ${(props) =>
    props.size === "small"
      ? "width: 30%;"
      : "width: 80%; max-width: var(--mi-container-medium);"};

  border-radius: var(--mi-border-radius-x);

  ${(props) =>
    props.size === "small"
      ? ""
      : "bottom: 0; border-radius: var(--mi-border-radius-x) var(--mi-border-radius-x) 0 0; max-height: calc(100vh - 70px);"}

  animation: 300ms ease-out forwards slide-up;

  h1 {
    display: inline-block;
  }

  @media (max-width: ${bp.xlarge}px) {
    ${(props) => (props.size === "small" ? "width: 50%;" : "")}
  }

  @media (max-width: ${bp.large}px) {
    ${(props) => (props.size === "small" ? "width: 70%;" : "")}
  }

  @media (max-width: ${bp.small}px) {
    max-height: calc(90vh - 80px);
    ${(props) =>
      props.size === "small"
        ? "width: 90%;"
        : "bottom: 0; border-radius: var(--mi-border-radius-focus) var(--mi-border-radius-focus) 0  0; width: 100%;"}
    padding-top: 0;
  }
`;

const close = css`
  color: #aaa;
  float: right;
  border: none;
  background: none;
  cursor: pointer;
  line-height: 1.5rem;
  font-size: 1rem !important;

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
              align-items: center;
              margin-bottom: 0.5rem;
              background-color: var(--mi-lighter-background-color) !important;
              padding: 1rem;
              border-radius: var(--mi-border-radius-x) var(--mi-border-radius-x)
                0 0;
              padding-bottom: 0.5rem !important;
              background-color: inherit;
              border-bottom: solid 1px rgba(125, 125, 125, 0.3);
              z-index: 12;

              ${!title ? "justify-content: flex-end !important;" : ""}
              button {
                ${!title ? "margin-bottom: 0.2rem;" : ""}
              }

              h2 {
                flex: 85%;
                max-width: 85%;
                margin-bottom: 0 !important;
              }

              @media (prefers-color-scheme: dark) {
                background-color: #080808 !important;
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
          <ChildrenWrapper>{children}</ChildrenWrapper>
        </Content>
      </div>
    </>,
    container
  );
};

export default Modal;
