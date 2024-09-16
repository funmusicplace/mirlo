import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import Button from "../common/Button";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useLogoutMutation } from "queries";
import { getArtistManageUrl } from "utils/artist";

const Menu: React.FC = (props) => {
  const { setIsMenuOpen } = props as {
    setIsMenuOpen: (val: boolean) => void;
  };
  const { t } = useTranslation("translation", { keyPrefix: "headerMenu" });
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [artists, setArtists] = React.useState<Artist[]>([]);

  const { user } = useAuthContext();
  const userId = user?.id;

  const fetchArtists = React.useCallback(async () => {
    if (userId) {
      const fetchedArtists = await api.getMany<Artist>(`manage/artists`);
      if (fetchedArtists) {
        setArtists(fetchedArtists.results);
      }
    }
  }, [userId]);

  React.useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  const { mutate: logout } = useLogoutMutation();

  const onLogOut = React.useCallback(() => {
    logout(undefined, {
      onSuccess() {
        snackbar(t("logOutSuccess"), { type: "success" });
        navigate("/");
        setIsMenuOpen(false);
      },
    });
  }, [logout, navigate, setIsMenuOpen, snackbar, t]);

  return (
    <menu className={css``}>
      {user && (
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

          <div
            className={css`
              border-bottom: var(--mi-border);
              border-top: var(--mi-border);
              margin: 0.5rem 0;
              max-height: 190px;
              overflow: auto;
            `}
          >
            {artists.map((a) => {
              return (
                <li key={a.id}>
                  <Button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate(getArtistManageUrl(a.id));
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
          </div>
          {user?.isAdmin && (
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
          {user?.isAdmin && (
            <li>
              <Button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate("/fulfillment");
                }}
              >
                {t("fulfillment")}
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
      {!user && (
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
