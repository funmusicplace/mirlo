import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryAuthProfile, useAuthRefreshMutation } from "queries";
import { QUERY_KEY_AUTH, queryKeyIncludes } from "queries/queryKeys";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

const AuthContext = React.createContext<{
  /**
   * [user] can have the following states:
   * - undefined: the fetch is loading / we don't know if auth is successful yet
   * - null: the query has resolved, and the user is not logged in
   * - [LoggedInUser]: the user is logged in
   */
  user?: LoggedInUser | null;
}>({
  user: undefined,
});

export function AuthContextProvider({ children }: React.PropsWithChildren) {
  const { data: user } = useQuery(queryAuthProfile());
  const { i18n } = useTranslation();
  const userId = user?.id;

  const { authRefresh } = useAuthRefreshMutation();

  const userLanguage = user?.language;
  React.useEffect(() => {
    i18n.changeLanguage(userLanguage);
  }, [userLanguage]);

  React.useEffect(() => {
    let interval: NodeJS.Timer | null = null;

    if (userId) {
      interval = setInterval(
        async () => {
          authRefresh();
        },
        1000 * 60 * 5
      ); // refresh every 5 minutes
    }
    return () => (interval ? clearInterval(interval) : undefined);
  }, [userId, authRefresh]);

  const context = useMemo(() => ({ user }), [user]);

  return (
    <AuthContext.Provider value={context}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext() {
  const { user } = React.useContext(AuthContext);

  // TODO: eventually remove the manual refreshLoggedInUser() once everything is a mutation
  const queryClient = useQueryClient();
  const refreshLoggedInUser = React.useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => queryKeyIncludes(query, QUERY_KEY_AUTH),
    });
  }, [queryClient]);

  return { user, refreshLoggedInUser };
}
