import { useQuery } from "@tanstack/react-query";
import Box from "components/common/Box";
import Button from "components/common/Button";
import {
  ArtistManagerInvite,
  queryArtistInvites,
  useAcceptArtistInviteMutation,
  useLeaveArtistMutation,
} from "queries";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistManageUrl } from "utils/artist";

/** Pending invites for the logged in user to help manage someone's artist. */
const ArtistInvites: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manage" });
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const { data: invites } = useQuery(queryArtistInvites());
  const { mutateAsync: accept, isPending: isAccepting } =
    useAcceptArtistInviteMutation();
  const { mutateAsync: decline, isPending: isDeclining } =
    useLeaveArtistMutation();

  if (!invites?.length) {
    return null;
  }

  const onAccept = async (invite: ArtistManagerInvite) => {
    await accept({ artistId: invite.artist.id });
    snackbar(t("inviteAccepted", { artistName: invite.artist.name }), {
      type: "success",
    });
    navigate(getArtistManageUrl(invite.artist.id));
  };

  const onDecline = async (invite: ArtistManagerInvite) => {
    await decline({ artistId: invite.artist.id });
    snackbar(t("inviteDeclined"), { type: "success" });
  };

  return (
    <section className="mt-4">
      <h2>{t("artistInvites")}</h2>
      <ul className="flex flex-col gap-2 list-none p-0 m-0">
        {invites.map((invite) => (
          <li key={invite.artist.id}>
            <Box
              variant="info"
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <p className="m-0">
                <Trans
                  t={t}
                  i18nKey="inviteFromTo"
                  values={{
                    inviterName: invite.invitedBy.name || t("someone"),
                    artistName: invite.artist.name,
                  }}
                  components={{ bold: <strong /> }}
                />
              </p>
              <div className="flex gap-2">
                <Button
                  size="compact"
                  buttonRole="primary"
                  disabled={isAccepting || isDeclining}
                  onClick={() => onAccept(invite)}
                >
                  {t("acceptInvite")}
                </Button>
                <Button
                  size="compact"
                  variant="outlined"
                  disabled={isAccepting || isDeclining}
                  onClick={() => onDecline(invite)}
                >
                  {t("declineInvite")}
                </Button>
              </div>
            </Box>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ArtistInvites;
