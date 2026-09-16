import { useAdminUnresolvedContentFlagsCountQuery } from "queries/admin";
import React from "react";

const UnresolvedContentFlagsPill: React.FC = () => {
  const { data: count } = useAdminUnresolvedContentFlagsCountQuery();

  if (!count) {
    return null;
  }

  return (
    <span className="inline-flex items-center justify-center shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-(--mi-warning-background-color) text-(--mi-white) text-xs font-bold leading-none">
      {count}
    </span>
  );
};

export default UnresolvedContentFlagsPill;
