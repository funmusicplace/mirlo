import { QueryFunction, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./fetch/fetchWrapper";
import { QUERY_KEY_AUTH } from "./keys";
import { MirloFetchError } from "./fetch/MirloFetchError";

type LoginBody = {
  email: string;
  password: string;
};

async function login(body: LoginBody) {
  await api.Post("auth/login", body);
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
  await api.Get("auth/logout", {});
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
    client: String(process.env.REACT_APP_CLIENT_DOMAIN),
  };

  await api.Post("auth/signup", signupBody, {
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
  await api.Post("auth/refresh", {});
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
  LoggedInUser|null,
  [{ query: "fetchProfile" }, ...unknown[]]
> = ({ signal }) => {
  return api.Get<{ result: LoggedInUser }>(`auth/profile`, { signal })
    .then(r => r.result)
    .catch(e => {
      // If the user is logged out, return null as a successful response
      if (e instanceof MirloFetchError && e.status === 401)
        return null;
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
    queryKey: [{ query: "fetchProfile" }, QUERY_KEY_AUTH],
    queryFn: fetchProfile,
  });
}
