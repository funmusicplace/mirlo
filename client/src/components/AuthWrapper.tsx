import { useGlobalStateContext } from "state/GlobalState";

export const AuthWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    state: { user },
  } = useGlobalStateContext();
  if (!user) {
    // return null;
    window.location.assign("/");
  }
  return <>{children}</>;
};
