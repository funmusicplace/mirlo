import { css } from "@emotion/css";
import React from "react";
import { FaTimes } from "react-icons/fa";
import { ImMenu } from "react-icons/im";
import { Link, useNavigate } from "react-router-dom";
import { colorShade, theme } from "utils/theme";
import { API_ROOT } from "./../constants";
import { useGlobalStateContext } from "./../state/GlobalState";
import Button from "./common/Button";
import IconButton from "./common/IconButton";

const Header = () => {
  const { state, dispatch } = useGlobalStateContext();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);

  const onLogOut = React.useCallback(async () => {
    await fetch(API_ROOT + "/auth/logout", {
      method: "GET",
      credentials: "include",
    });
    dispatch({
      type: "setLoggedInUser",
      user: undefined,
    });
    navigate("/");
    setIsMenuOpen(false);
  }, [dispatch, navigate]);

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
        <Link to="/">blackbird...</Link>
      </h1>
      {isMenuOpen && (
        <div
          className={css`
            position: absolute;
            top: 0;
            width: 100%;
            height: 70%;
            background: ${theme.colors.primaryHighlight};
          `}
        >
          <IconButton onClick={() => setIsMenuOpen(false)}>
            <FaTimes />
          </IconButton>
          <menu
            className={css`
              list-style: none;

              & li * {
                background: transparent !important;
                width: 100%;
                text-decoration: none;
                text-align: center;
                display: block;
                color: ${theme.colors.text};
                font-weight: bold;
                border-radius: 0;
                border: none;

                &:hover {
                  background: ${colorShade(
                    theme.colors.primaryHighlight,
                    -50
                  )} !important;
                  border: none !important;
                }
              }
            `}
          >
            {state.user && (
              <>
                <li>
                  <Button onClick={onLogOut} className={css``}>
                    Log out
                  </Button>
                </li>
                <li>
                  <Button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate("/profile");
                    }}
                  >
                    Profile
                  </Button>
                </li>
                <li>
                  <Button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate("/manage");
                    }}
                  >
                    Manage
                  </Button>
                </li>
              </>
            )}
            {!state.user && (
              <>
                <li>
                  <Button
                    className={css`
                      margin-right: 0.75rem;
                    `}
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate("/login");
                    }}
                  >
                    log in
                  </Button>
                </li>
                <li
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate("/signup");
                  }}
                >
                  <Button>sign up</Button>
                </li>
              </>
            )}
          </menu>
        </div>
      )}
      <IconButton
        variant="outlined"
        onClick={() => {
          setIsMenuOpen(true);
        }}
      >
        <ImMenu color={theme.colors.text} />
      </IconButton>
    </header>
  );
};

export default Header;
