import produce from "immer";
import React, { createContext } from "react";
import { useGlobalStateContext } from "./GlobalState";
import { useParams } from "react-router-dom";
import api from "services/api";

export interface ArtistState {
  artist?: Artist;
  isLoading?: boolean;
  userStripeStatus?: AccountStatus;
  isArtistContext?: boolean;
}

type SetState = {
  type: "setState";
  state: ArtistState;
};

type SetArtist = {
  type: "setArtist";
  artist: Artist;
};

type SetLoading = {
  type: "setIsLoading";
  isLoading: boolean;
};

type Actions = SetArtist | SetLoading | SetState;

export const stateReducer = produce((draft: ArtistState, action: Actions) => {
  switch (action.type) {
    case "setState":
      draft = action.state;
      break;
    case "setArtist":
      draft = {
        artist: action.artist,
      };
      break;
    case "setIsLoading":
      draft = {
        isLoading: action.isLoading,
      };
      break;
    default:
      break;
  }

  return { ...draft, isArtistContext: true };
});

const ArtistContext = createContext(
  {} as [ArtistState, React.Dispatch<Actions>]
);

export const ArtistProvider: React.FC<{
  children: React.ReactNode;
  managedArtist?: boolean;
}> = ({ children, managedArtist }) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const userId = user?.id;
  const { artistId } = useParams();
  const [state, dispatch] = React.useReducer(stateReducer, {
    isArtistContext: true,
  });

  React.useEffect(() => {
    const callback = async () => {
      let artist;
      dispatch({ type: "setIsLoading", isLoading: true });
      if (managedArtist) {
        const { result } = await api.get<Artist>(
          `users/${userId}/artists/${artistId}`
        );
        artist = result;
      } else {
        const { result } = await api.get<Artist>(`artists/${artistId}`);
        artist = result;
      }

      const checkAccountStatus = await api.get<AccountStatus>(
        `users/${artist.userId}/stripe/checkAccountStatus`
      );
      dispatch({
        type: "setState",
        state: {
          isLoading: false,
          artist,
          userStripeStatus: checkAccountStatus.result,
        },
      });
    };
    callback();
  }, [managedArtist, userId, artistId]);

  return (
    <ArtistContext.Provider value={[state, dispatch]}>
      {children}
    </ArtistContext.Provider>
  );
};

export const useArtistContext = () => {
  const artistContext = React.useContext(ArtistContext);
  return { state: artistContext[0], dispatch: artistContext[1] };
};
