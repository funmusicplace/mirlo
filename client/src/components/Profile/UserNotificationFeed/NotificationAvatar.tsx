import React from "react";

const NotificationAvatar: React.FC<{
  name?: string;
  compact?: boolean;
}> = ({ name, compact }) => {
  const initial = name ? Array.from(name)[0] : undefined;

  return (
    <div
      aria-hidden="true"
      className={
        compact
          ? "w-7 h-7 rounded-full shrink-0 bg-(--mi-pink) flex items-center justify-center font-bold text-xs text-white"
          : "w-11 h-11 rounded-full shrink-0 bg-(--mi-pink) flex items-center justify-center font-bold text-base text-white"
      }
    >
      {(initial ?? "?").toUpperCase()}
    </div>
  );
};

export default NotificationAvatar;
