import {
  QueryFunction,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { getInjectedAuthUser } from "utils/injectedData";

import * as api from "./fetch/fetchWrapper";
import { MirloFetchError } from "./fetch/MirloFetchError";
import { QUERY_KEY_AUTH } from "./queryKeys";

type LoginBody = {
  email: string;
  password: string;
};

async function login(body: LoginBody) {
  await api.post("auth/login", body);
}

export function useLoginMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: login,
    async onSuccess() {
      await client.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_AUTH),
      });
    },
  });
}

async function logout() {
  await api.get("auth/logout", {});
}

export function useLogoutMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: logout,
    async onSuccess() {
      await client.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_AUTH),
      });
    },
  });
}

type SignupBody = {
  email: string;
  name: string;
  password: string;
  receiveMailingList: boolean;
  accountType: "listener";
  client: string;
};

async function signup(body: Omit<SignupBody, "client">) {
  const signupBody: SignupBody = {
    ...body,
    client: String(process.env.API_DOMAIN),
  };

  await api.post("auth/signup", signupBody, {
    credentials: undefined,
  });
}

export function useSignupMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: signup,
    onSuccess() {
      client.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_AUTH),
      });
    },
  });
}

export async function authRefresh() {
  await api.post("auth/refresh", {});
}

export function useAuthRefreshMutation() {
  const client = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: authRefresh,
    async onSuccess() {
      await client.invalidateQueries({
        predicate: (query) => query.queryKey.includes(QUERY_KEY_AUTH),
      });
    },
  });

  return { authRefresh: mutate };
}

const fetchProfile: QueryFunction<
  LoggedInUser | null,
  ["fetchProfile", ...string[]]
> = ({ signal }) => {
  return api
    .get<{ result: LoggedInUser }>(`auth/profile`, { signal })
    .then((r) => r.result)
    .catch((e) => {
      // If the user is logged out, return null as a successful response
      if (e instanceof MirloFetchError && e.status === 401) return null;
      else throw e;
    });
};

/**
 * Query for the currently-authenticated user profile.
 *
 * @returns null if the user isn't logged in, or [LoggedInUser] if successful
 */
export function queryAuthProfile() {
  return queryOptions({
    queryKey: ["fetchProfile", QUERY_KEY_AUTH],
    queryFn: fetchProfile,
    initialData: getInjectedAuthUser,
    // Always verify auth state in the background on page load. The server
    // injects initialData into the HTML, so the UI is immediately populated,
    // but a background refetch confirms the session is still valid.
    refetchOnMount: "always",
    // Do not refetch on window focus. Every embedded widget iframe is a
    // separate React app with its own QueryClient; with refetchOnWindowFocus
    // enabled the visibilitychange event fires inside each iframe and causes
    // one auth/profile request per widget every time the user switches tabs.
    refetchOnWindowFocus: false,
  });
}
