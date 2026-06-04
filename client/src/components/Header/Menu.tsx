import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import CanCreateArtists from "components/CanCreateArtists";
import { Button, IconButton } from "components/common/Button";
import MenuLink from "components/Header/MenuLink";
import { queryManagedArtists, useLogoutMutation } from "queries";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FaArrowRight, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistManageUrl } from "utils/artist";

const Menu = forwardRef<
  HTMLDialogElement,
  {
    buttonId: string;
    dialogId: string;
    isAdmin: boolean;
    isLabelAccount: boolean;
    onClose: () => void;
  }
>(({ buttonId, dialogId, isAdmin, isLabelAccount, onClose }, ref) => {
  const { t } = useTranslation("translation", { keyPrefix: "headerMenu" });

  const {
    data: { results: artists } = {},
    isLoading,
    refetch,
  } = useQuery(queryManagedArtists());

  const seeOrderPages = isLabelAccount || !!artists?.length;

  const snackbar = useSnackbar();

  const navigate = useNavigate();
  const { mutate: logout } = useLogoutMutation();

  const onLogOut = useCallback(() => {
    logout(undefined, {
      onSuccess() {
        refetch();
        snackbar(t("logOutSuccess"), { type: "success" });
        navigate("/");
      },
    });
  }, [logout, navigate, snackbar, t]);

  // Need to use ref in `onClick`, see https://stackoverflow.com/a/77055468
  // This ref can be removed once `closedby` is baseline
  const refHandle = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => refHandle.current!, []);

  return (
    <dialog
      aria-labelledby={buttonId}
      className="inset-s-0 sm:inset-s-auto sm:inset-e-0 max-w-[100vw] max-h-full w-screen sm:w-[300px] h-full backdrop:bg-[rgba(0,0,0,.5)]"
      closedby="any"
      data-nosnippet
      id={dialogId}
      ref={refHandle}
      onClick={(event) => {
        // Workaround to close on click backdrop, part of dialog
        // Click on dialog itself blocked by nested div
        // This handler can be removed once `closedby` is baseline
        const didClickBackdrop = event.target === refHandle.current;
        didClickBackdrop && onClose();
      }}
      onKeyDown={(event) => {
        event.key === "Escape" && onClose();
      }}
    >
      {/* This div can be removed once `closedby` is baseline*/}
      <div className="flex flex-col h-full p-[1rem]">
        <IconButton
          label="Close menu"
          autoFocus
          className="self-end border-none bg-transparent! text-black! hover:bg-transparent! hover:no-underline focus:bg-transparent! focus:no-underline [&_svg]:fill-black!"
          // @ts-ignore React doesn't support Invoker Commands API
          command="close"
          commandfor={dialogId}
          onClick={() => onClose()}
        >
          <FaTimes />
        </IconButton>
        <nav className="flex-auto">
          <ul>
            <li>
              <MenuLink onClick={onClose} to="/profile/notifications">
                {t("yourFeed")}
              </MenuLink>
            </li>

            <li>
              <MenuLink onClick={onClose} to="/profile/collection">
                {t("collection")}
              </MenuLink>
            </li>
            <li
              aria-hidden
              className="border-t border-(--mi-tint-x-color) my-2"
            />
            <CanCreateArtists>
              {isLabelAccount && (
                <>
                  <li>
                    <MenuLink onClick={onClose} to="/account/label">
                      {t("manageLabel")}
                    </MenuLink>
                  </li>
                  {(() => {
                    const labelArtist = artists?.find((a) => a.isLabelProfile);
                    return labelArtist?.urlSlug ? (
                      <li>
                        <MenuLink
                          onClick={onClose}
                          to={`/${labelArtist.urlSlug}`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="min-w-0 wrap-anywhere">
                              {t("viewLabelPage", {
                                labelName: labelArtist.name,
                              })}
                            </span>
                            <FaArrowRight className="shrink-0 text-xs" />
                          </span>
                        </MenuLink>
                      </li>
                    ) : null;
                  })()}
                </>
              )}
              {!isLabelAccount && (
                <li>
                  <MenuLink onClick={onClose} to="/manage">
                    {t("manage")}
                  </MenuLink>
                </li>
              )}
              <li>
                <ul
                  className={css`
                    margin: 0;
                    padding: 0;
                    max-height: 190px;
                    overflow-y: auto;
                    border-top: 1px solid var(--mi-tint-x-color);
                    border-bottom: 1px solid var(--mi-tint-x-color);
                    background-color: var(--mi-darken-background-color);
                    box-shadow:
                      inset 0 4px 4px -4px rgba(0, 0, 0, 0.15),
                      inset 0 -4px 4px -4px rgba(0, 0, 0, 0.15);
                  `}
                >
                  {isLoading && (
                    <LoadingBlocks rows={1} height="2rem" margin=".25rem" />
                  )}
                  {artists
                    ?.filter((a) => !a.isLabelProfile)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((a) => {
                      return (
                        <li key={a.id}>
                          <MenuLink
                            onClick={onClose}
                            title={a.name}
                            to={getArtistManageUrl(a.id)}
                          >
                            {a.name}
                          </MenuLink>
                        </li>
                      );
                    })}
                </ul>
              </li>
            </CanCreateArtists>
            {seeOrderPages && (
              <>
                <li>
                  <MenuLink onClick={onClose} to="/sales">
                    {t("viewSalesPage")}
                  </MenuLink>
                </li>
                <li>
                  <MenuLink onClick={onClose} to="/fulfillment">
                    {t("fulfillment")}
                  </MenuLink>
                </li>
              </>
            )}
            <li>
              <MenuLink onClick={onClose} to="/account">
                {t("account")}
              </MenuLink>
            </li>
            {isAdmin && (
              <li>
                <MenuLink onClick={onClose} to="/admin">
                  {t("admin")}
                </MenuLink>
              </li>
            )}
            <li
              aria-hidden
              className="border-t border-(--mi-tint-x-color) my-2"
            />
            <li>
              <MenuLink onClick={onClose} to="https://docs.mirlo.space">
                {t("about")}
              </MenuLink>
            </li>
          </ul>
        </nav>
        <Button
          onClick={() => {
            onClose();
            onLogOut();
          }}
        >
          {t("logOut")}
        </Button>
      </div>
    </dialog>
  );
});

export default Menu;
