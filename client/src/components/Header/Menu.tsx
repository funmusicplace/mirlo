import { css } from "@emotion/css";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { API_ROOT } from "../../constants";
import { useGlobalStateContext } from "../../state/GlobalState";
import Button from "../common/Button";
import api from "services/api";
import { FaCheck } from "react-icons/fa";

const Menu: React.FC<{ setIsMenuOpen: (bool: boolean) => void }> = ({
  setIsMenuOpen,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "headerMenu" });
  const { state, dispatch } = useGlobalStateContext();
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const [artists, setArtists] = React.useState<Artist[]>([]);
  const [stripeAccountStatus, setStripeAccountStatus] =
    React.useState<AccountStatus>();

  const userId = state.user?.id;

  const fetchArtists = React.useCallback(async () => {
    if (userId) {
      const fetchedArtists = await api.getMany<Artist>(
        `users/${userId}/artists`
      );
      if (fetchedArtists) {
        setArtists(fetchedArtists.results);
      }

      const checkAccountStatus = await api.get<AccountStatus>(
        `users/${userId}/stripe/checkAccountStatus`
      );
      setStripeAccountStatus(checkAccountStatus.result);
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

        & li > * {
          background: transparent !important;
          // width: 100%;
          width: 200px;
          text-decoration: none;
          text-align: right;
          display: block;
          color: var(--mi-normal-foreground-color);
          font-weight: normal;
          border-radius: 0;
          padding: 0.5rem;

          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          border: none;

          &:hover {
            border-radius: 0;
            background: var(--mi-lighten-background-color) !important;
            border: none !important;
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
          {artists.length > 0 && stripeAccountStatus?.chargesEnabled && (
            <li>
              <Button
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate("/manage");
                }}
                startIcon={<FaCheck />}
              >
                Payouts enabled
              </Button>
            </li>
          )}
          {artists.map((a) => {
            return (
              <li>
                <Button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate(`/manage/artists/${a.id}`);
                  }}
                >
                  {a.name}
                </Button>
              </li>
            );
          })}
          <li>
            <Button onClick={onLogOut} className={css``}>
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
          {/* <li
            onClick={() => {
              setIsMenuOpen(false);
              navigate("/signup");
            }}
          >
            <Button>{t("signUp")}</Button>
          </li> */}
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
