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

const DropdownMenu: React.FC<{
  children: React.ReactElement | React.ReactElement[];
  dashed?: boolean;
  smallIcon?: boolean;
  icon?: React.ReactElement;
  compact?: boolean;
  label?: string;
  triggerClassName?: string;
}> = ({
  children,
  icon,
  compact,
  dashed,
  label,
  smallIcon,
  triggerClassName,
}) => {
  const [buttonPosition, setButtonPosition] = React.useState<{
    x: number;
    y: number;
    openUpward: boolean;
    openRightward: boolean;
  }>({ x: 0, y: 0, openUpward: false, openRightward: false });

  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);

  if (!icon) {
    icon = <FaEllipsisV />;
  }

  const colors = useGetArtistColors();

  const LocalButton = colors ? ArtistButton : Button;

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
                padding: 0.5rem;
                z-index: 999;
                overflow: hidden;
                min-width: 215px;
                max-width: 215px;
                text-overflow: ellipsis;
                background: var(--mi-background-color) !important;

                button {
                  color: var(--mi-text-color) !important;
                }

                li {
                  list-style-type: none;
                }

                li > * {
                  min-width: 200px;
                  list-style-type: none;
                  text-decoration: none;
                  text-align: right;
                  display: block;
                  white-space: normal;
                  color: var(--mi-text-color) !important;
                  background-color: var(--mi-background-color) !important;
                  word-break: break-word;
                  font-weight: normal;
                  border-radius: 0;
                  padding: 0.5rem;
                  margin: 0rem;

                  display: flex;
                  align-items: center;
                  justify-content: flex-end;
                  border: none;
                }

                li > a,
                li > button {
                  &:hover {
                    border-radius: 0;
                    background: var(--mi-text-color) !important;
                    color: var(--mi-background-color) !important;
                    border: none;
                  }
                }
              `}
            >
              {React.Children.map(children, (child) =>
                React.cloneElement(child, { setIsMenuOpen })
              )}
            </div>
          </>,
          document.body
        )}

      <LocalButton
        size={compact ? "compact" : undefined}
        variant={dashed ? "dashed" : "transparent"}
        aria-label={label}
        role="menu"
        className={`${css`
          ${!triggerClassName
            ? `
            background: transparent !important;

            &:hover {
              background: transparent !important;
            }
          `
            : ""}

          @media screen and (max-width: ${bp.medium}px) {
            ${smallIcon
              ? "width: 2rem !important; height: 2rem !important;"
              : ""}
            svg {
              ${smallIcon ? "width: .3rem !important; margin-left:1rem;" : ""}
            }
          }
        `}${triggerClassName ? ` ${triggerClassName}` : ""}`}
        onClick={(e) => {
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
        }}
        startIcon={icon}
      />
    </div>
  );
};

export default DropdownMenu;
