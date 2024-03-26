import produce from "immer";
import React, { createContext } from "react";
import { useLocation, useParams } from "react-router-dom";
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

type SetLoading = {
  type: "setIsLoading";
  isLoading: boolean;
};

type Actions = SetLoading | SetState;

export const fetchArtist = async (
  artistId: string,
  managedArtist: boolean,
  signal: AbortSignal,
) => {
  let artist;
  if (artistId) {
    const { result } = await api.get<Artist>(`artists/${artistId}`, signal);
    const publicArtist = result;

    if (managedArtist) {
      const { result } = await api.get<Artist>(
        `users/${publicArtist.userId}/artists/${artistId}`,
        signal,
      );
      artist = result;
    } else {
      artist = publicArtist;
    }
  }

  return signal.aborted ? undefined : artist;
};

export const checkArtistStripeStatus = async (artistUserId: number, signal: AbortSignal) => {
  let checkAccountStatus;
  try {
    checkAccountStatus = await api.get<AccountStatus>(
      `users/${artistUserId}/stripe/checkAccountStatus`,
      signal,
    );
  } catch (e) {
    console.error("Stripe didn't work", e);
  }
  return checkAccountStatus;
};

export const stateReducer = produce((draft: ArtistState, action: Actions) => {
  switch (action.type) {
    case "setState":
      draft = action.state;
      break;
    case "setIsLoading":
      draft = {
        ...draft,
        isLoading: action.isLoading,
      };
      break;
    default:
      break;
  }

  return { ...draft, isArtistContext: true };
});

const ArtistContext = createContext(
  {} as [ArtistState, React.Dispatch<Actions>, () => Promise<void>]
);

export const ArtistProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { pathname } = useLocation();
  const { artistId } = useParams();
  const [state, dispatch] = React.useReducer(stateReducer, {
    isArtistContext: artistId ? true : false,
    isLoading: true,
  });
  const [refresh, setRefresh] = React.useState(0);

  const refreshArtist = React.useCallback(async () => {
    setRefresh(refresh + 1);
  }, [refresh, setRefresh]);

  const initialLoad = React.useCallback(
    async (signal: AbortSignal) => {
      let state: Actions|undefined = undefined;

      if (artistId) {
        dispatch({ type: "setIsLoading", isLoading: true });
        const artist = await fetchArtist(
          artistId,
          pathname.includes("manage"),
          signal,
        );

        if (artist) {
          const checkAccountStatus = await checkArtistStripeStatus(
            artist.userId,
            signal,
          );

          state = {
            type: "setState",
            state: {
              isLoading: false,
              artist,
              userStripeStatus: checkAccountStatus?.result ?? {
                detailsSubmitted: false,
                chargesEnabled: false,
              },
              isArtistContext: true,
            },
          };
        }
      } else {
        state = {
          type: "setState",
          state: {
            isLoading: false,
            artist: undefined,
            userStripeStatus: undefined,
            isArtistContext: false,
          },
        };
      }

      if (state !== undefined && !signal.aborted) {
        dispatch(state);
      }
    },
    [artistId, pathname]
  );

  React.useEffect(() => {
    const controller = new AbortController();
    initialLoad(controller.signal);

    return () => controller.abort();
  }, [initialLoad, refresh]);

  return (
    <ArtistContext.Provider value={[state, dispatch, refreshArtist]}>
      {children}
    </ArtistContext.Provider>
  );
};

export const useArtistContext = () => {
  const artistContext = React.useContext(ArtistContext);
  return {
    state: artistContext[0],
    dispatch: artistContext[1],
    refresh: artistContext[2],
  };
};
