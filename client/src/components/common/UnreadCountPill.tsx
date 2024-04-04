import { css } from "@emotion/css";
import React from "react";
import api from "services/api";
import Pill from "./Pill";
import { useAuthContext } from "state/AuthContext";

const UnreadCountPill = () => {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const { user } = useAuthContext();
  const userId = user?.id;
  React.useEffect(() => {
    const callback = async () => {
      const response = await api.get<number>(
        `users/${userId}/notifications/unreadCount`
      );
      setUnreadCount(response.result);
    };
    callback();
  }, [userId]);

  return unreadCount > 0 ? (
    <Pill
      className={css`
        margin-left: 0.5rem;
      `}
    >
      {unreadCount}
    </Pill>
  ) : null;
};

export default UnreadCountPill;
