import { css } from "@emotion/css";
import React from "react";
import { bp } from "../../constants";

import Background from "components/common/Background";
import { FaEllipsisV } from "react-icons/fa";
import Button from "./Button";

const DropdownMenu: React.FC<{
  children: React.ReactElement;
  icon?: React.ReactElement;
  compact?: boolean;
}> = ({ children, icon, compact }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);

  if (!icon) {
    icon = <FaEllipsisV />;
  }

  return (
    <div
      className={css`
        position: relative;
      `}
    >
      {isMenuOpen && (
        <>
          <Background
            onClick={() => {
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
              background: var(--mi-white);
              button {
                color: var(--mi-black);
              }

              li {
                list-style-type: none;
              }

              li > * {
                background: transparent !important;
                width: 200px;
                list-style-type: none;
                text-decoration: none;
                text-align: right;
                display: block;
                white-space: normal;
                color: var(--mi-black);
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
                  background: var(--mi-black) !important;
                  color: var(--mi-white) !important;
                  border: none !important;
                }
              }

              @media (prefers-color-scheme: dark) {
                background: var(--mi-black);
                button {
                  color: var(--mi-white);
                }
                li > * {
                  background-color: var(--mi-black);
                  color: var(--mi-white);

                  &:hover {
                    background-color: var(--mi-white) !important;
                    color: var(--mi-black) !important;
                  }
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
        compact={compact}
        onClick={() => {
          setIsMenuOpen(true);
        }}
        className={css`
          button:hover {
            color: var(--mi-white);
            background-color: var(--mi-black);
          }
          @media (max-width: ${bp.small}px) {
            background-color: var(--mi-normal-background-color) !important;
          }
        `}
      >
        {icon}
      </Button>
    </div>
  );
};

export default DropdownMenu;
