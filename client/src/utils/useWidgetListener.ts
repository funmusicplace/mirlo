import React from "react";
import { useGlobalStateContext } from "state/GlobalState";

const useWidgetListener = () => {
  const { dispatch } = useGlobalStateContext();

  React.useEffect(() => {
    window.addEventListener("message", (event) => {
      // identify correctness of message from iframe
      if (
        event.origin === process.env.REACT_APP_CLIENT_DOMAIN &&
        event.data.includes?.("blackbird")
      ) {
        const data = event.data.split(":");
        dispatch({
          type: "startPlayingIds",
          playerQueueIds: [+data[3]],
        });
      }
    });
  }, [dispatch]);
};

export default useWidgetListener;
