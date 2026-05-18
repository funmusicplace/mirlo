import React from "react";

type SectionActionStripProps = {
  tight?: boolean;
  className?: string;
  children: React.ReactNode;
};

const SectionActionStrip: React.FC<SectionActionStripProps> = ({
  tight,
  className,
  children,
}) => (
  <div
    className={`flex items-center justify-end gap-2 ${
      tight ? "-mt-3 mb-1" : "my-2"
    } ${className ?? ""}`}
  >
    {children}
  </div>
);

export default SectionActionStrip;
