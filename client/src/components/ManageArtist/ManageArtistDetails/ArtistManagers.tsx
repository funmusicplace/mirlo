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

const inviteErrorKey = (e: unknown) => {
  if (e instanceof MirloFetchError) {
    switch (e.status) {
      case 404:
        return "inviteNoAccount";
      case 409:
        return "inviteAlreadyInvited";
      case 400:
        return "inviteIsOwner";
    }
  }
  return "inviteError";
};

const ArtistManagers: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });
  const { user } = useAuthContext();
  const { isOwner } = useArtistRelationship(artist);
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { ask } = useConfirm();
  const [email, setEmail] = React.useState("");

  const { data: managers } = useQuery(queryArtistManagers(artist.id));
  const { mutateAsync: invite, isPending: isInviting } =
    useInviteArtistManagerMutation();
  const { mutateAsync: remove } = useRemoveArtistManagerMutation();
  const { mutateAsync: leave } = useLeaveArtistMutation();

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await invite({ artistId: artist.id, email });
      setEmail("");
      snackbar(t("inviteSent"), { type: "success" });
    } catch (e) {
      snackbar(t(inviteErrorKey(e)), { type: "warning" });
    }
  };

  const onRemove = async (manager: ArtistManager) => {
    const name = manager.user.name || manager.user.email;
    if (!(await ask(t("removeManagerConfirm", { name })))) {
      return;
    }
    await remove({ artistId: artist.id, userId: manager.userId });
  };

  const onLeave = async () => {
    if (!(await ask(t("leaveArtistConfirm")))) {
      return;
    }
    await leave({ artistId: artist.id });
    navigate("/manage");
  };

  return (
    <div className="flex flex-col gap-4 w-full" id="team">
      <div>
        <h2 className="mb-2">{t("teamTitle")}</h2>
        <p className="text-sm">
          {isOwner ? t("teamDescription") : t("teamManagerDescription")}
        </p>
      </div>

      {managers?.length === 0 && <p className="text-sm">{t("teamEmpty")}</p>}

      {!!managers?.length && (
        <Table>
          <thead>
            <tr>
              <th>{t("name", { keyPrefix: "manageArtist" })}</th>
              <th>{t("email", { keyPrefix: "manageArtist" })}</th>
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
                <td>{manager.user.name}</td>
                <td>{manager.user.email}</td>
                <td>
                  {manager.acceptedAt ? (
                    t("teamActive")
                  ) : (
                    <Pill>{t("teamPending")}</Pill>
                  )}
                </td>
                <td className="text-right">
                  {isOwner && (
                    <ArtistButton
                      type="button"
                      size="compact"
                      variant="outlined"
                      onClick={() => onRemove(manager)}
                    >
                      {t("removeManager")}
                    </ArtistButton>
                  )}
                  {!isOwner && manager.userId === user?.id && (
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

      {isOwner && (
        <form onSubmit={onInvite} className="max-w-[500px]">
          <FormComponent>
            <label htmlFor="input-invite-manager">
              {t("inviteEmailLabel")}
            </label>
            <InputEl
              aria-describedby="hint-invite-manager"
              id="input-invite-manager"
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
