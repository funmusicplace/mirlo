import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, onClick, ariaLabel }) => {
  return (
    <button onClick={onClick} aria-label={ariaLabel} className={css`
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      &:focus {
        outline: 2px solid #1a0dab;
        outline-offset: 2px;
      }
    `}>
      {icon}
    </button>
  );
};

export default IconButton;