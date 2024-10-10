import { css } from '@emotion/css';
import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

const buttonStyle = css`
  background-color: #6200ee; /* Sufficient contrast */
  color: #ffffff; /* White text on purple background */
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 4px;
  
  &:hover,
  &:focus {
    background-color: #3700b3; /* Darker shade for hover/focus */
    outline: 2px solid #ffffff;
    outline-offset: 2px;
  }
`;

const Button: React.FC<ButtonProps> = ({ onClick, children }) => (
  <button className={buttonStyle} onClick={onClick}>
    {children}
  </button>
);

export default Button;