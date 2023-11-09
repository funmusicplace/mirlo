import { css } from "@emotion/css";
import React from "react";

import IconButton from "../common/IconButton";

import Background from "components/common/Background";
import { FaEllipsisV } from "react-icons/fa";

const Header: React.FC<{
  children: React.ReactElement;
  icon?: React.ReactElement;
}> = ({ children, icon }) => {
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
              top: 2.5rem;
              right: 0;
              padding: 0.5rem;
              z-index: 12;
              padding-bottom: 1rem;
              background: var(--mi-normal-background-color);
            `}
          >
            {React.Children.map(children, (child) =>
              React.cloneElement(child, { setIsMenuOpen })
            )}
          </div>
        </>
      )}

      <IconButton
        transparent
        onClick={() => {
          setIsMenuOpen(true);
        }}
      >
        {icon}
      </IconButton>
    </div>
  );
};

export default Header;
