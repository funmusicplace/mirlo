import React from "react";

interface StepCardProps {
  children: React.ReactNode;
  className?: string;
}

const BASE_CLASS_NAME = "rounded-lg bg-(--mi-alternate-background-color) p-8";

const StepCard: React.FC<StepCardProps> = ({ children, className }) => {
  const composedClassName = className
    ? `${BASE_CLASS_NAME} ${className}`
    : BASE_CLASS_NAME;

  return <div className={composedClassName}>{children}</div>;
};

export default StepCard;
