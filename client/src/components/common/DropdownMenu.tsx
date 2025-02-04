import { css } from "@emotion/css";
import React from "react";

import Background from "components/common/Background";
import { FaEllipsisV } from "react-icons/fa";
import Button from "./Button";

const DropdownMenu: React.FC<{
  children: React.ReactElement | React.ReactElement[];
  dashed?: boolean;
  icon?: React.ReactElement;
  compact?: boolean;
}> = ({ children, icon, compact, dashed }) => {
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

          svg {
            fill: black;
          }
        }
      `}
    >
      {isMenuOpen && (
        <>
          <Background
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(false);
            }}
          />
          <div
            className={css`
              position: absolute;
              top: 47px;
              border-radius: var(--mi-border-radius);
              right: 0em;
              padding: 0.5rem;
              z-index: 999;
              overflow: hidden;
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
                background-color: var(--mi-normal-background-color) !important;
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
        </>
      )}

      <Button
        size={compact ? "compact" : undefined}
        variant={dashed ? "dashed" : "transparent"}
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen(true);
        }}
        startIcon={icon}
      />
    </div>
  );
};

export default DropdownMenu;
