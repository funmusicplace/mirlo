import { css } from "@emotion/css";
import React from "react";

import Background from "components/common/Background";
import { FaEllipsisV } from "react-icons/fa";
import Button from "./Button";

import { useGetArtistColors } from "components/Artist/ArtistButtons";
import { createPortal } from "react-dom";

const DropdownMenu: React.FC<{
  children: React.ReactElement | React.ReactElement[];
  dashed?: boolean;
  icon?: React.ReactElement;
  compact?: boolean;
  label?: string;
}> = ({ children, icon, compact, dashed, label }) => {
  const { colors } = useGetArtistColors();
  const [buttonPosition, setButtonPosition] = React.useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);

  if (!icon) {
    icon = <FaEllipsisV />;
  }

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
                top: calc(${buttonPosition.y}px + 1.5rem);
                left: ${buttonPosition.x}px;
                transform: translateX(-100%);
                border-radius: var(--mi-border-radius);
                right: 0em;
                padding: 0.5rem;
                z-index: 999;
                overflow: hidden;
                min-width: 215px;
                max-width: 215px;
                text-overflow: ellipsis;
                background: var(--mi-normal-background-color) !important;

                button {
                  color: var(--mi-normal-foreground-color) !important;
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
                  color: var(--mi-normal-foreground-color) !important;
                  background-color: var(
                    --mi-normal-background-color
                  ) !important;
                  word-break: break-word;
                  font-weight: normal;
                  border-radius: 0;
                  padding: 0.5rem;
                  margin: 0rem;

                  display: flex;
                  align-items: center;
                  justify-content: flex-end;
                  border: none;

                  &:hover {
                    border-radius: 0;
                    background: var(--mi-normal-foreground-color) !important;
                    color: var(--mi-normal-background-color) !important;
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

      <Button
        size={compact ? "compact" : undefined}
        variant={dashed ? "dashed" : "transparent"}
        aria-label={label}
        role="menu"
        onClick={(e) => {
          e.stopPropagation();
          setButtonPosition({
            x: e.clientX,
            y: e.clientY,
          });
          setIsMenuOpen(true);
        }}
        startIcon={icon}
      />
    </div>
  );
};

export default DropdownMenu;
