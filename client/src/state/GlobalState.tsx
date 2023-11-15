import React, { createContext } from "react";
import produce from "immer";
import { clone, pullAt, shuffle } from "lodash";

export interface GlobalState {
  user?: LoggedInUser;
  playerQueueIds: number[];
  token?: string;
  playing?: boolean;
  looping?: "loopTrack" | "loopQueue";
  shuffle?: boolean;
  draggingTrackId?: number;
  currentlyPlayingIndex?: number;
  // userPlaylists?: { id: string; title: string }[];
  checkFavoriteStatusFlag?: number;
}

type SetLoggedInUser = {
  type: "setLoggedInUser";
  user?: LoggedInUser;
};

type IncrementFavoriteStatusFlag = {
  type: "incrementFavoriteStatusFlag";
};

type ClearQueue = {
  type: "clearQueue";
};

type AddToBackQueue = {
  type: "addTrackIdsToBackOfQueue";
  idsToAdd: number[];
};

type ShuffleQueue = {
  type: "shuffleQueue";
};

type SetState = {
  type: "setState";
  state: GlobalState;
};

type SetToken = {
  type: "setToken";
  token: string;
};

type SetPlaying = {
  type: "setPlaying";
  playing: boolean;
};

type SetPlayerQueueIds = {
  type: "setPlayerQueueIds";
  playerQueueIds: number[];
};

type SetDraggingTrackId = {
  type: "setDraggingTrackId";
  draggingTrackId: number | undefined;
};

type SetValuesDirectly = {
  type: "setValuesDirectly";
  values: Partial<GlobalState>;
};

type SetLooping = {
  type: "setLooping";
  looping: GlobalState["looping"];
};

type SetShuffle = {
  type: "setShuffle";
  shuffle: GlobalState["shuffle"];
};

type StartPlayingIds = {
  type: "startPlayingIds";
  playerQueueIds: number[];
};

type IncrementCurrentlyPlayingIndex = {
  type: "incrementCurrentlyPlayingIndex";
};

type DecrementCurrentlyPlayingIndex = {
  type: "decrementCurrentlyPlayingIndex";
};

type SetUserCredits = {
  type: "setUserCredits";
  credits: number;
};

type Actions =
  | SetLoggedInUser
  | SetState
  | AddToBackQueue
  | SetToken
  | SetPlaying
  | ClearQueue
  | SetPlayerQueueIds
  | ShuffleQueue
  | SetDraggingTrackId
  | SetValuesDirectly
  | SetLooping
  | SetShuffle
  | StartPlayingIds
  | IncrementCurrentlyPlayingIndex
  | DecrementCurrentlyPlayingIndex
  | SetUserCredits
  | IncrementFavoriteStatusFlag;

export const stateReducer = produce((draft: GlobalState, action: Actions) => {
  switch (action.type) {
    case "setState":
      draft = {
        ...action.state,
      };
      break;
    case "setValuesDirectly":
      draft = {
        ...draft,
        ...action.values,
      };
      break;
    case "startPlayingIds":
      draft.playing = true;
      draft.playerQueueIds = clone(action.playerQueueIds);
      if (draft.shuffle) {
        const firstId = pullAt(draft.playerQueueIds, 0);
        draft.playerQueueIds = [...firstId, ...shuffle(draft.playerQueueIds)];
      }
      draft.currentlyPlayingIndex = 0;
      break;
    case "setLoggedInUser":
      draft.user = action.user;
      break;
    case "setLooping":
      draft.looping = action.looping;
      break;
    case "setShuffle":
      draft.shuffle = action.shuffle;
      break;
    case "incrementCurrentlyPlayingIndex":
      let newIndex = undefined;
      const atEndOfQueue =
        draft.currentlyPlayingIndex === draft.playerQueueIds.length - 1;
      if (atEndOfQueue && draft.looping === "loopQueue") {
        newIndex = 0;
      } else if (atEndOfQueue) {
        newIndex = undefined;
      } else {
        newIndex = (draft.currentlyPlayingIndex ?? 0) + 1;
      }
      draft.currentlyPlayingIndex = newIndex;
      break;
    case "decrementCurrentlyPlayingIndex":
      draft.currentlyPlayingIndex = (draft.currentlyPlayingIndex ?? 0) - 1;
      break;
    case "addTrackIdsToBackOfQueue":
      const newTracks = draft.shuffle
        ? shuffle(action.idsToAdd)
        : action.idsToAdd;
      draft.playerQueueIds = [...draft.playerQueueIds, ...newTracks];
      break;
    case "setPlayerQueueIds":
      if (draft.shuffle) {
        draft.playerQueueIds = shuffle(action.playerQueueIds);
      } else {
        draft.playerQueueIds = action.playerQueueIds;
      }
      draft.currentlyPlayingIndex = 0;
      break;
    case "shuffleQueue": {
      let shuffled: number[] = [];
      if (draft.playing && draft.currentlyPlayingIndex !== undefined) {
        const currentlyPlayingID = pullAt(
          draft.playerQueueIds,
          draft.currentlyPlayingIndex
        );
        shuffled = [...currentlyPlayingID, ...shuffle(draft.playerQueueIds)];
      } else {
        shuffled = shuffle(draft.playerQueueIds);
      }
      draft.playerQueueIds = shuffled;
      draft.shuffle = true;
      break;
    }
    case "clearQueue":
      if (draft.playing && draft.currentlyPlayingIndex !== undefined) {
        draft.playerQueueIds = [
          draft.playerQueueIds[draft.currentlyPlayingIndex],
        ];
        break;
      }
      draft.playerQueueIds = [];
      draft.currentlyPlayingIndex = undefined;
      break;
    case "setToken":
      draft.token = action.token;
      break;
    case "setPlaying":
      draft.playing = action.playing;
      if (draft.currentlyPlayingIndex === undefined) {
        draft.currentlyPlayingIndex = 0;
      }
      break;
    case "setDraggingTrackId":
      draft.draggingTrackId = action.draggingTrackId;
      break;
    default:
      break;
  }
  localStorage.setItem(
    "nomadState",
    JSON.stringify({
      ...draft,
      // We don't want these to be persisted
      checkFavoriteStatusFlag: undefined,
      playing: undefined,
    })
  );
  return draft;
});

const GlobalContext = createContext(
  {} as [GlobalState, React.Dispatch<Actions>]
);

interface GlobalStateProviderProps {
  initialState?: GlobalState;
  children: React.ReactNode;
}

export const GlobalStateProvider: React.FC<GlobalStateProviderProps> = ({
  children,
}) => {
  const storedStateString = localStorage.getItem("nomadState");
  let storedState = undefined;

  try {
    storedState = JSON.parse(storedStateString ?? "");

    if (!storedState.playerQueueIds) {
      storedState.playerQueueIds = [];
    }
  } catch (e) {}

  const [state, dispatch] = React.useReducer(
    stateReducer,
    storedState ?? { playerQueueIds: [] }
  );

  return (
    <GlobalContext.Provider value={[state, dispatch]}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalStateContext = () => {
  const [state, dispatch] = React.useContext(GlobalContext);

  return { state, dispatch };
};
