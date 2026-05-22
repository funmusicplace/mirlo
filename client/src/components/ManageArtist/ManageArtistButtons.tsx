import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import DropdownMenu from "components/common/DropdownMenu";
import { DropdownMenuItemLink } from "components/common/DropdownMenuItem";
import FixedButtonLink from "components/common/FixedButton";
import {
  queryArtist,
  queryManagedArtistSubscriptionTier,
  queryManagedMerch,
  queryManagedTrackGroup,
  queryPost,
  queryTrackGroup,
} from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaEdit, FaEllipsisH, FaEye, FaPen, FaUserCog } from "react-icons/fa";
import { RiAdminLine } from "react-icons/ri";
import { useLocation, useParams } from "react-router-dom";
import { useAuthContext } from "state/AuthContext";
import { useGlobalStateContext } from "state/GlobalState";
import {
  getArtistTiersUrl,
  getManageReleaseUrl,
  getMerchUrl,
  getReleaseUrl,
} from "utils/artist";

import { bp } from "../../constants";

const ManageArtistButtons: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "manageArtist" });
  const { pathname } = useLocation();
  const { state } = useGlobalStateContext();
  const isUp = state.playerQueueIds.length > 0;
  const { artistId, merchId, tierId, trackGroupId, postId } = useParams();
  const isManagePage =
    pathname.includes("/manage/artists") && !pathname.includes("/customize");
  const seeViewLink = pathname.includes("/manage/artists");
  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const { data: trackGroup } = useQuery(
    queryTrackGroup({
      albumSlug: trackGroupId ?? "",
      artistId,
    })
  );
  const { data: managedTrackGroup } = useQuery(
    queryManagedTrackGroup(Number(trackGroupId) ?? 0)
  );
  const { data: merch } = useQuery(queryManagedMerch(merchId ?? ""));
  const { data: tier } = useQuery(
    queryManagedArtistSubscriptionTier({
      artistId: Number(artistId),
      tierId: Number(tierId),
    })
  );
  const { data: post } = useQuery(
    queryPost({ postId: postId ?? "", artistId: artistId ?? "" })
  );
  const { user } = useAuthContext();

  const canLabelEditArtist = artist?.artistLabels?.some(
    (label) => label.labelUserId === user?.id && label.canLabelAddReleases
  );

  const canEditArtist =
    artist &&
    (user?.id === artist?.userId || user?.isAdmin || canLabelEditArtist);

  const isAlbumPage = Boolean(trackGroupId);

  const isPreorder = managedTrackGroup?.isPreorder ?? false;

  if (!artist) {
    return null;
  }

  type ButtonItem = {
    key: string;
    to: string;
    icon: React.ReactElement;
    label: string;
  };

  const buttonItems: ButtonItem[] = [];

  if (user?.isAdmin) {
    buttonItems.push({
      key: "adminEditUser",
      to: `/admin/users/${artist.userId}`,
      icon: <RiAdminLine />,
      label: t("adminEditUser"),
    });
    buttonItems.push({
      key: "adminEditArtist",
      to: `/admin/artists/${artist.id}`,
      icon: <RiAdminLine />,
      label: t("adminEditArtist"),
    });
    if (isAlbumPage && trackGroup) {
      buttonItems.push({
        key: "adminEditRelease",
        to: `/admin/trackGroups/${trackGroup.id}`,
        icon: <RiAdminLine />,
        label: t("adminEditRelease"),
      });
    }
  }

  if (canEditArtist) {
    if (!isAlbumPage) {
      buttonItems.push({
        key: "customizeLook",
        to: `/manage/artists/${artist.id}/customize`,
        icon: <FaUserCog />,
        label: t(
          artist.isLabelProfile ? "customizeLabelLook" : "customizeLook"
        ),
      });
    }
    if (!isManagePage && !isAlbumPage) {
      buttonItems.push({
        key: "editPage",
        to: `/manage/artists/${artist.id}`,
        icon: <FaPen />,
        label: t(artist.isLabelProfile ? "editLabelPage" : "editPage"),
      });
    }
    if (seeViewLink && !isAlbumPage && !merch && !tier && !post) {
      buttonItems.push({
        key: "viewLive",
        to: `/${artist?.urlSlug?.toLowerCase() ?? artist?.id}`,
        icon: <FaEye />,
        label: t("viewLive"),
      });
    }
    if (trackGroup && isAlbumPage) {
      buttonItems.push({
        key: "editRelease",
        to: getManageReleaseUrl(artist, trackGroup),
        icon: <FaEdit />,
        label: t("editRelease"),
      });
    }
    if (post && !isManagePage) {
      buttonItems.push({
        key: "editPost",
        to: `/manage/artists/${post.artistId}/post/${post.id}`,
        icon: <FaEdit />,
        label: t("editPost"),
      });
    }
    if (managedTrackGroup) {
      buttonItems.push({
        key: "viewLiveTrackGroup",
        to: getReleaseUrl(artist, managedTrackGroup),
        icon: <FaEye />,
        label: t(isPreorder ? "viewPreorder" : "viewLive"),
      });
    }
    if (merch && isManagePage) {
      buttonItems.push({
        key: "viewLiveMerch",
        to: getMerchUrl(artist, merch),
        icon: <FaEye />,
        label: t("viewLive"),
      });
    }
    if (tier && isManagePage) {
      buttonItems.push({
        key: "viewLiveTier",
        to: getArtistTiersUrl(artist),
        icon: <FaEye />,
        label: t("viewLive"),
      });
    }
  }

  if (buttonItems.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={css`
          z-index: 10;
          bottom: ${isUp ? "80px" : "20px"};
          left: 1rem;
          position: fixed;
          transition: all 0.3s ease;

          @media screen and (max-width: ${bp.medium}px) {
            bottom: var(
              --fixed-actions-bottom-offset-mobile,
              var(--fixed-actions-bottom-offset, ${isUp ? "80px" : "20px"})
            );
            left: 0.5rem;
          }
        `}
      >
        <div className="hidden xl:flex flex-col gap-2">
          {buttonItems.map((item) => (
            <FixedButtonLink
              key={item.key}
              to={item.to}
              endIcon={item.icon}
              size="compact"
              rounded
              variant="dashed"
            >
              {item.label}
            </FixedButtonLink>
          ))}
        </div>
        <div className="xl:hidden">
          <DropdownMenu
            compact
            icon={<FaEllipsisH />}
            triggerClassName={css`
              && {
                box-shadow: 1px 1px 0.15rem rgba(0, 0, 0, 0.15);
                background: var(--mi-fixed-bg-color) !important;
                color: var(--mi-fixed-fg-color) !important;
                border: 1px solid
                  color-mix(in srgb, var(--mi-fixed-fg-color) 40%, transparent) !important;

                svg {
                  fill: var(--mi-fixed-fg-color) !important;
                }

                &:hover:not(:disabled) {
                  background: var(--mi-fixed-fg-color) !important;
                  color: var(--mi-fixed-bg-color) !important;

                  svg {
                    fill: var(--mi-fixed-bg-color) !important;
                  }
                }
              }
            `}
          >
            <ul>
              {buttonItems.map((item) => (
                <li key={item.key}>
                  <DropdownMenuItemLink to={item.to} startIcon={item.icon}>
                    {item.label}
                  </DropdownMenuItemLink>
                </li>
              ))}
            </ul>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default ManageArtistButtons;
