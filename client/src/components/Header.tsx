import { css } from "@emotion/css";
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { theme } from "utils/theme";
import { API_ROOT } from "./../constants";
import { useGlobalStateContext } from "./../state/GlobalState";
import Button from "./common/Button";

const Header = () => {
  const { state, dispatch } = useGlobalStateContext();
  const navigate = useNavigate();
  return (
    <header
      className={css`
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        background-color: ${theme.colors.primaryHighlight};
        margin-bottom: 1rem;
      `}
    >
      <h1
        className={css`
          color: ${theme.colors.text};
          margin-top: -0.1rem;
        `}
      >
        nomads...
      </h1>
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
                navigate("/");
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
              <Button
                className={css`
                  margin-right: 0.75rem;
                `}
              >
                log in
              </Button>
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
