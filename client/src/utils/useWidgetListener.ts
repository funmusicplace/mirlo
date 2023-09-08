import React from "react";
import { useGlobalStateContext } from "state/GlobalState";

const useWidgetListener = () => {
  const { dispatch } = useGlobalStateContext();

  React.useEffect(() => {
    window.addEventListener("message", (event) => {
      // identify correctness of message from iframe
      if (
        event.origin === process.env.REACT_APP_CLIENT_DOMAIN &&
        event.data.includes?.("mirlo")
      ) {
        const data = event.data.split(":");
        const action = data[1];

        if (action === "play") {
          dispatch({
            type: "startPlayingIds",
            playerQueueIds: [+data[3]],
          });
        } else if (action === "pause") {
          dispatch({
            type: "setPlaying",
            playing: false,
          });
        }
      }
    });
  }, [dispatch]);
};

export default useWidgetListener;
