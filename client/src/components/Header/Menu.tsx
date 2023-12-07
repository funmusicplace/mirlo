import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { API_ROOT } from "../../constants";
import { useGlobalStateContext } from "../../state/GlobalState";
import Button from "../common/Button";
import api from "services/api";

const Menu: React.FC = (props) => {
  const { setIsMenuOpen } = props as {
    setIsMenuOpen: (val: boolean) => void;
  };
  const { t } = useTranslation("translation", { keyPrefix: "headerMenu" });
  const { state, dispatch } = useGlobalStateContext();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [artists, setArtists] = React.useState<Artist[]>([]);

  const userId = state.user?.id;

  const fetchArtists = React.useCallback(async () => {
    if (userId) {
      const fetchedArtists = await api.getMany<Artist>(
        `users/${userId}/artists`
      );
      if (fetchedArtists) {
        setArtists(fetchedArtists.results);
      }
    }
  }, [userId]);

  React.useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

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
        button {
          font-size: var(--mi-font-size-normal);
          height: auto;
        }

        & li > * {
          background: transparent !important;
          width: 200px;
          text-decoration: none;
          text-align: right;
          display: block;
          white-space: normal;
          color: var(--mi-black);
          word-break: break-word;
          font-weight: normal;
          border-radius: 0;
          padding: 0.5rem;
          margin: 0rem;

          display: flex;
          align-items: center;
          justify-content: flex-end;
          border: none;

          &:hover {
            border-radius: 0;
            background: var(--mi-black) !important;
            color: var(--mi-white) !important;
            border: none !important;
          }
        }
        @media (prefers-color-scheme: dark) {
          & li > * {
            background-color: var(--mi-black);
            color: var(--mi-white);

            &:hover {
              background-color: var(--mi-white) !important;
              color: var(--mi-black) !important;
            }
          }
        }
      `}
    >
      {state.user && (
        <>
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
                navigate("/profile/collection");
              }}
            >
              {t("collection")}
            </Button>
          </li>
          <li
            className={css`
              border-bottom: solid 1px var(--mi-lighter-foreground-color);
            `}
          >
            <Button
              onClick={() => {
                setIsMenuOpen(false);
                navigate("/manage");
              }}
            >
              {t("manage")}
            </Button>
          </li>
          {artists.map((a) => {
            return (
              <li key={a.id}>
                <Button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate(`/manage/artists/${a.id}`);
                  }}
                >
                  <div
                    className={css`
                      font-weight: bold;
                      opacity: 0.7;
                      font-size: 0.9rem;
                    `}
                  >
                    {a.name}
                  </div>
                </Button>
              </li>
            );
          })}
          {state?.user?.isAdmin && (
            <li>
              <Button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate("/admin");
                }}
              >
                {t("admin")}
              </Button>
            </li>
          )}
          <li>
            <Button
              onClick={onLogOut}
              className={css`
                border-top: solid 1px var(--mi-lighter-foreground-color);
              `}
            >
              {t("logOut")}
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
        </>
      )}
      <li
        onClick={() => {
          setIsMenuOpen(false);
          navigate("/pages/about");
        }}
      >
        <Button>{t("about")}</Button>
      </li>
    </menu>
  );
};

export default Menu;
