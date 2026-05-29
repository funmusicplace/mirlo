import { css } from "@emotion/css";
import {
  ArtistButton,
  useGetArtistColors,
} from "components/Artist/ArtistButtons";
import Background from "components/common/Background";
import React from "react";
import { createPortal } from "react-dom";
import { FaEllipsisV } from "react-icons/fa";

import { bp } from "../../constants";

import Button from "./Button";

const DropdownMenuContext = React.createContext<{ close: () => void } | null>(
  null
);

export const useDropdownMenu = () => React.useContext(DropdownMenuContext);

const DropdownMenu: React.FC<{
  children: React.ReactElement | React.ReactElement[];
  dashed?: boolean;
  smallIcon?: boolean;
  icon?: React.ReactElement;
  compact?: boolean;
  label?: string;
  triggerClassName?: string;
  trigger?: React.ReactElement;
}> = ({
  children,
  icon,
  compact,
  dashed,
  label,
  smallIcon,
  triggerClassName,
  trigger,
}) => {
  const [buttonPosition, setButtonPosition] = React.useState<{
    x: number;
    y: number;
    openUpward: boolean;
    openRightward: boolean;
  }>({ x: 0, y: 0, openUpward: false, openRightward: false });

  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  const colors = useGetArtistColors();
  const LocalButton = colors ? ArtistButton : Button;

  const defaultTrigger = (
    <LocalButton
      size={compact ? "compact" : undefined}
      variant={dashed ? "dashed" : "transparent"}
      className={`${css`
        ${!triggerClassName
          ? `
          background: transparent !important;

          &:hover {
            background: transparent !important;
          }
        `
          : ""}
      `}${triggerClassName ? ` ${triggerClassName}` : ""}`}
      startIcon={icon ?? <FaEllipsisV />}
    />
  );

  const renderedTrigger = trigger ?? defaultTrigger;

  const openMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const openRightward = rect.left < window.innerWidth / 2;
    const openUpward = rect.top > window.innerHeight / 2;
    setButtonPosition({
      x: openRightward ? rect.left : rect.right,
      y: rect.top,
      openUpward,
      openRightward,
    });
    setIsMenuOpen(true);
  };

  const triggerElement = React.cloneElement(renderedTrigger, {
    "aria-label": renderedTrigger.props["aria-label"] ?? label,
    "aria-haspopup": "menu",
    "aria-expanded": isMenuOpen,
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      renderedTrigger.props.onClick?.(e);
      if (e.defaultPrevented) {
        return;
      }
      openMenu(e);
    },
  });

  return (
    <div
      className={css`
        position: relative;

        > button {
          flex-grow: 1;
        }
      `}
    >
      {isMenuOpen &&
        createPortal(
          <>
            <Background
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(false);
              }}
            />
            <div
              className={css`
                position: fixed;
                ${buttonPosition.openUpward
                  ? `bottom: calc(100vh - ${buttonPosition.y}px + 0.5rem);`
                  : `top: calc(${buttonPosition.y}px + 1.5rem);`}
                left: ${buttonPosition.x}px;
                transform: ${buttonPosition.openRightward
                  ? "none"
                  : "translateX(-100%)"};
                border-radius: var(--mi-border-radius);
                padding: 0;
                z-index: 999;
                overflow: hidden;
                min-width: 215px;
                max-width: 215px;
                text-overflow: ellipsis;
                background: var(--mi-background-color);
                color: var(--mi-text-color);

                li {
                  list-style-type: none;
                  background: var(--mi-background-color);
                  color: var(--mi-text-color);
                }

                li > * {
                  width: 100%;
                  min-width: 0;
                  list-style-type: none;
                  text-decoration: none;
                  text-align: right;
                  white-space: normal;
                  color: inherit !important;
                  background: transparent !important;
                  word-break: break-word;
                  font-weight: normal;
                  border-radius: 0;
                  padding: 0.5rem 0.75rem;
                  margin: 0;

                  display: flex;
                  align-items: center;
                  justify-content: flex-end;
                  border: none;
                }

                li > * svg {
                  fill: currentColor !important;
                }

                li:hover,
                li:focus-within,
                li:active {
                  background: var(--mi-text-color);
                  color: var(--mi-background-color);
                }

                @media screen and (max-width: ${bp.medium}px) {
                  top: 50% !important;
                  bottom: auto !important;
                  left: 50% !important;
                  right: auto !important;
                  transform: translate(-50%, -50%) !important;
                  min-width: 0;
                  max-width: none;
                  width: min(90vw, 360px);
                  border-radius: var(--mi-border-radius-x);
                  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);

                  ul {
                    display: grid;
                    grid-template-columns: 1fr auto auto 1fr;
                    column-gap: 0.75rem;
                    padding: 0;
                    margin: 0;
                  }

                  li {
                    display: grid;
                    grid-template-columns: subgrid;
                    grid-column: 1 / -1;
                    padding: 0;
                    font-size: 0.875rem;
                  }

                  li + li {
                    border-top: 1px solid var(--mi-darken-color);
                  }

                  li > * {
                    display: grid !important;
                    grid-template-columns: subgrid;
                    grid-column: 1 / -1;
                    align-items: center;
                    padding: 0.875rem 1rem;
                    width: 100%;
                  }

                  li .startIcon {
                    justify-self: end;
                    grid-column: 2;
                  }

                  li .children {
                    justify-self: start;
                    grid-column: 3;
                    text-align: left;
                  }

                  li svg {
                    width: 1rem;
                    height: 1rem;
                  }
                }
              `}
            >
              <DropdownMenuContext.Provider
                value={{ close: () => setIsMenuOpen(false) }}
              >
                {React.Children.map(children, (child) =>
                  React.cloneElement(child, { setIsMenuOpen })
                )}
              </DropdownMenuContext.Provider>
            </div>
          </>,
          document.body
        )}

      {triggerElement}
    </div>
  );
};

export default DropdownMenu;
