import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useGlobalStateContext } from "../state/GlobalState";
import Button from "./common/Button";

function Profile() {
  const {
    state: { user },
    dispatch,
  } = useGlobalStateContext();

  const fetchProfile = React.useCallback(async () => {
    const profile = await api.get<LoggedInUser>("profile");
    dispatch({
      type: "setLoggedInUser",
      user: profile,
    });
  }, [dispatch]);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!user) {
    return null;
  }

  return (
    <div
      className={css`
        max-width: 200px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
      `}
    >
      <h2>Profile</h2>
      <div>
        email:
        {user.email}
      </div>
      <div>
        name:
        {user.name}
      </div>
      <Link to="/manage">Manage</Link>
    </div>
  );
}

export default Profile;
