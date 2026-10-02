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
  const [hasDeclined, setHasDeclined] = React.useState(false);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  if (!invites?.length && !hasDeclined) {
    return null;
  }

  const onAccept = async (invite: ArtistManagerInvite) => {
    try {
      await accept({ artistId: invite.artist.id });
      snackbar(t("inviteAccepted", { artistName: invite.artist.name }), {
        type: "success",
      });
      navigate(getArtistManageUrl(invite.artist.id));
    } catch (e) {
      snackbar(t("inviteActionError"), { type: "warning" });
    }
  };

  const onDecline = async (invite: ArtistManagerInvite) => {
    setHasDeclined(true);
    try {
      await decline({ artistId: invite.artist.id });
      snackbar(t("inviteDeclined"), { type: "success" });
      headingRef.current?.focus();
    } catch (e) {
      snackbar(t("inviteActionError"), { type: "warning" });
    }
  };

  return (
    <section className="mt-4">
      <h2 ref={headingRef} tabIndex={-1}>
        {t("artistInvites")}
      </h2>
      {!invites?.length && <p>{t("noPendingInvites")}</p>}
      <ul className="flex flex-col gap-2 list-none p-0 m-0">
        {invites?.map((invite) => (
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
                  aria-label={t("acceptInviteNamed", {
                    artistName: invite.artist.name,
                  })}
                  onClick={() => onAccept(invite)}
                >
                  {t("acceptInvite")}
                </Button>
                <Button
                  size="compact"
                  variant="outlined"
                  disabled={isAccepting || isDeclining}
                  aria-label={t("declineInviteNamed", {
                    artistName: invite.artist.name,
                  })}
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
