import { css } from "@emotion/css";
import React from "react";
import { NavLink } from "react-router-dom";
import { API_ROOT } from "./../constants";
import { useGlobalStateContext } from "./../state/GlobalState";
import Button from "./common/Button";

const Header = () => {
  const { state, dispatch } = useGlobalStateContext();
  return (
    <header
      className={css`
        display: flex;
        justify-content: flex-end;
        padding: 0.5rem 1rem;
      `}
    >
      <menu className={css``}>
        {state.user && (
          <>
            <Button
              onClick={async () => {
                await fetch(API_ROOT + "/auth/logout", {
                  method: "GET",
                  credentials: "include",
                });
                dispatch({
                  type: "setLoggedInUser",
                  user: undefined,
                });
              }}
              className={css`
                padding: 0.25rem 0.5rem;
                border: 1px solid grey;
                border-radius: 6px;
              `}
            >
              log out
            </Button>
            <NavLink to="/profile">
              <Button>{state.user?.name} </Button>
            </NavLink>
          </>
        )}
        {!state.user && (
          <>
            <NavLink to="/login">
              <Button>log in</Button>
            </NavLink>
            <NavLink to="/signup">
              <Button>sign up</Button>
            </NavLink>
          </>
        )}
      </menu>
    </header>
  );
};

export default Header;
