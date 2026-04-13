import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import Button from "components/common/Button";
import CanCreateArtists from "components/CanCreateArtists";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import MenuLink from "components/Header/MenuLink";
import { queryManagedArtists, useLogoutMutation } from "queries";
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
      className="inset-e-0 inset-s-auto max-w-full max-h-full w-full sm:w-[300px] h-full backdrop:bg-[rgba(0,0,0,.5)]"
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
        <Button
          aria-label="Close menu"
          autoFocus
          className="border-none bg-transparent pointer leading-[1.5rem] h-[2rem]! text-[1rem]! self-end hover:no-underline focus:no-underline"
          // @ts-ignore React doesn't support Invoker Commands API
          command="close"
          commandfor={dialogId}
          onClick={() => onClose()}
          size="compact"
          startIcon={<FaTimes />}
        />
        <nav className="flex-auto">
          <ul>
            <li>
              <MenuLink onClick={onClose} to="/profile">
                {t("profile")}
              </MenuLink>
            </li>

            <li>
              <MenuLink onClick={onClose} to="/profile/collection">
                {t("collection")}
              </MenuLink>
            </li>
            <CanCreateArtists>
              {isLabelAccount && (
                <li>
                  <MenuLink onClick={onClose} to="/profile/label">
                    {t("manageLabel")}
                  </MenuLink>
                </li>
              )}
              {!isLabelAccount && (
                <li>
                  <MenuLink onClick={onClose} to="/manage">
                    {t("manage")}
                  </MenuLink>
                </li>
              )}
              <li>
                <ul className="border-y border-y-(--mi-normal-foreground-color)! m-0 p-0! max-h-[190px] overflow-auto">
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
            {seeOrderPages && (
              <>
                <li>
                  <MenuLink onClick={onClose} to="/fulfillment">
                    {t("fulfillment")}
                  </MenuLink>
                </li>
                <li>
                  <MenuLink onClick={onClose} to="/sales">
                    {t("viewSalesPage")}
                  </MenuLink>
                </li>
              </>
            )}
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
