import { css } from "@emotion/css";
import React from "react";
import { bp } from "../../constants";
import IconButton from "../common/IconButton";

import Background from "components/common/Background";
import { FaEllipsisV } from "react-icons/fa";

const Header: React.FC<{
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

              @media (prefers-color-scheme: dark) {
                background: var(--mi-black);
                button {
                  color: var(--mi-white);
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

      <IconButton
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
      </IconButton>
    </div>
  );
};

export default Header;
