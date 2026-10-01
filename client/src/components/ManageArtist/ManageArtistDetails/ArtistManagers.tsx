import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Pill from "components/common/Pill";
import Table from "components/common/Table";
import {
  ArtistManager,
  queryArtistManagers,
  useInviteArtistManagerMutation,
  useLeaveArtistMutation,
  useRemoveArtistManagerMutation,
} from "queries";
import { MirloFetchError } from "queries/fetch/MirloFetchError";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import useArtistRelationship from "utils/useArtistRelationship";
import { useConfirm } from "utils/useConfirm";

const INVITE_ERROR_KEYS: Record<string, string> = {
  manager_invite_no_account: "inviteNoAccount",
  manager_invite_already_invited: "inviteAlreadyInvited",
  manager_invite_is_owner: "inviteIsOwner",
};

const inviteErrorKey = (e: unknown) =>
  (e instanceof MirloFetchError && e.code && INVITE_ERROR_KEYS[e.code]) ||
  "inviteError";

const ArtistManagers: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { user } = useAuthContext();
  const { relationship, hasOwnerRights } = useArtistRelationship(artist);
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { ask } = useConfirm();
  const [email, setEmail] = React.useState("");
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);

  const { data: managers } = useQuery(queryArtistManagers(artist.id));
  const { mutateAsync: invite, isPending: isInviting } =
    useInviteArtistManagerMutation();
  const { mutateAsync: remove } = useRemoveArtistManagerMutation();
  const { mutateAsync: leave } = useLeaveArtistMutation();

  const displayName = (manager: ArtistManager) =>
    manager.user.name || manager.user.email || t("teamNoName");

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await invite({ artistId: artist.id, email });
      setEmail("");
      snackbar(t("inviteSent"), { type: "success" });
    } catch (e) {
      snackbar(t(inviteErrorKey(e)), { type: "warning" });
    }
    emailRef.current?.focus();
  };

  const onRemove = async (manager: ArtistManager) => {
    if (
      !(await ask(t("removeManagerConfirm", { name: displayName(manager) })))
    ) {
      return;
    }
    try {
      await remove({ artistId: artist.id, userId: manager.userId });
      headingRef.current?.focus();
    } catch (e) {
      snackbar(t("teamActionError"), { type: "warning" });
    }
  };

  const onLeave = async () => {
    if (!(await ask(t("leaveArtistConfirm")))) {
      return;
    }
    try {
      await leave({ artistId: artist.id });
      navigate("/manage");
    } catch (e) {
      snackbar(t("teamActionError"), { type: "warning" });
    }
  };

  if (!relationship && !hasOwnerRights) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 w-full" id="team">
      <div>
        <h2 className="mb-2" ref={headingRef} tabIndex={-1}>
          {t("teamTitle")}
        </h2>
        <p className="text-sm">
          {hasOwnerRights ? t("teamDescription") : t("teamManagerDescription")}
        </p>
      </div>

      {managers?.length === 0 && <p className="text-sm">{t("teamEmpty")}</p>}

      {!!managers?.length && (
        <Table>
          <thead>
            <tr>
              <th>{t("name", { keyPrefix: "manageArtist" })}</th>
              {hasOwnerRights && (
                <th>{t("email", { keyPrefix: "manageArtist" })}</th>
              )}
              <th>{t("teamStatus")}</th>
              <th>
                <span className="sr-only">
                  {t("actions", { keyPrefix: "manageArtist" })}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {managers.map((manager) => (
              <tr key={manager.userId}>
                <td>{manager.user.name || t("teamNoName")}</td>
                {hasOwnerRights && <td>{manager.user.email}</td>}
                <td>
                  {manager.acceptedAt ? (
                    t("teamActive")
                  ) : (
                    <Pill>{t("teamPending")}</Pill>
                  )}
                </td>
                <td className="text-right">
                  {hasOwnerRights && (
                    <ArtistButton
                      type="button"
                      size="compact"
                      variant="outlined"
                      aria-label={t("removeManagerNamed", {
                        name: displayName(manager),
                      })}
                      onClick={() => onRemove(manager)}
                    >
                      {t("removeManager")}
                    </ArtistButton>
                  )}
                  {!hasOwnerRights && manager.userId === user?.id && (
                    <ArtistButton
                      type="button"
                      size="compact"
                      variant="outlined"
                      onClick={onLeave}
                    >
                      {t("leaveArtist")}
                    </ArtistButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {hasOwnerRights && (
        <form onSubmit={onInvite} className="max-w-[500px]">
          <FormComponent>
            <label htmlFor="input-invite-manager">
              {t("inviteEmailLabel")}
            </label>
            <InputEl
              aria-describedby="hint-invite-manager"
              id="input-invite-manager"
              ref={emailRef}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <small id="hint-invite-manager">{t("inviteEmailHint")}</small>
          </FormComponent>
          <ArtistButton
            type="submit"
            disabled={isInviting || !email}
            isLoading={isInviting}
          >
            {t("sendInvite")}
          </ArtistButton>
        </form>
      )}
    </div>
  );
};

export default ArtistManagers;
