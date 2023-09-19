import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { colorShade, theme } from "utils/theme";
import { API_ROOT } from "../../constants";
import { useGlobalStateContext } from "../../state/GlobalState";
import Button from "../common/Button";

const Menu: React.FC<{ setIsMenuOpen: (bool: boolean) => void }> = ({
  setIsMenuOpen,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "headerMenu" });
  const { state, dispatch } = useGlobalStateContext();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const onLogOut = React.useCallback(async () => {
    await fetch(API_ROOT + "/auth/logout", {
      method: "GET",
      credentials: "include",
    });
    dispatch({
      type: "setLoggedInUser",
      user: undefined,
    });
    snackbar(t("logOutSuccess"), { type: "success" });
    navigate("/");
    setIsMenuOpen(false);
  }, [dispatch, navigate, setIsMenuOpen, snackbar, t]);

  return (
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
            border-radius: 0;
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
              {t("logOut")}
            </Button>
          </li>
          <li>
            <Button
              onClick={() => {
                setIsMenuOpen(false);
                navigate("/profile");
              }}
            >
              {t("profile")}
            </Button>
          </li>
          <li>
            <Button
              onClick={() => {
                setIsMenuOpen(false);
                navigate("/manage");
              }}
            >
              {t("manage")}
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
              {t("logIn")}
            </Button>
          </li>
          <li
            onClick={() => {
              setIsMenuOpen(false);
              navigate("/signup");
            }}
          >
            <Button>{t("signUp")}</Button>
          </li>
        </>
      )}
      <li
        onClick={() => {
          setIsMenuOpen(false);
          navigate("/about");
        }}
      >
        <Button>{t("about")}</Button>
      </li>
    </menu>
  );
};

export default Menu;
