import { css } from "@emotion/css";
import { AuthWrapper } from "components/AuthWrapper";
import CanCreateArtists from "components/CanCreateArtists";
import { Navigate, useParams, type RouteObject } from "react-router-dom";

import App from "./App";
import ErrorPage from "./components/ErrorPage";

async function markdownPage(source: string) {
  const { PageMarkdownWrapper } =
    await import("components/common/PageMarkdownWrapper");
  const { default: MarkdownContent } =
    await import("components/common/MarkdownContent");
  const { default: WidthContainer } =
    await import("components/common/WidthContainer");

  return {
    Component: () => (
      <WidthContainer
        variant="big"
        className="max-md:p-(--mi-side-paddings-small)"
      >
        <PageMarkdownWrapper className="pt-8">
          <MarkdownContent source={source} />
        </PageMarkdownWrapper>
      </WidthContainer>
    ),
  };
}

const routes: RouteObject[] = [
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "",
        async lazy() {
          const { default: Component } = await import("pages/home/Index");
          return { Component };
        },
      },
      {
        path: "pages/about",
        async lazy() {
          return {
            Component: () => {
              window.location.assign("https://docs.mirlo.space");
              return null;
            },
          };
        },
      },
      {
        path: "pages/cookie-policy",
        handle: { title: "cookiePolicy" },
        lazy: () => markdownPage("cookie-policy"),
      },
      {
        path: "pages/privacy",
        handle: { title: "privacyPolicy" },
        lazy: () => markdownPage("privacy"),
      },
      {
        path: "pages/terms",
        handle: { title: "terms" },
        lazy: () => markdownPage("terms"),
      },
      {
        path: "pages/content-policy",
        handle: { title: "contentPolicy" },
        lazy: () => markdownPage("content-policy"),
      },
      {
        path: "pages/features",
        async lazy() {
          return {
            Component: () => {
              window.location.assign("https://docs.mirlo.space/features");
              return null;
            },
          };
        },
      },
      {
        path: "checkout",
        handle: { title: "checkout" },
        async lazy() {
          const { default: Component } = await import("pages/checkout/Index");
          return { Component };
        },
      },
      {
        path: "widget/track/:id",
        async lazy() {
          const { default: Component } =
            await import("pages/widget/track/{id}/Index");
          return { Component };
        },
      },
      {
        path: "widget/trackgroup/:id",
        async lazy() {
          const { default: Component } =
            await import("pages/widget/trackgroup/{id}/Index");
          return { Component };
        },
      },
      {
        path: "widget/post/:id",
        async lazy() {
          const { default: Component } =
            await import("pages/widget/post/{id}/Index");
          return { Component };
        },
      },
      {
        path: "widget/label/:id",
        async lazy() {
          const { default: Component } =
            await import("pages/widget/label/{id}/Index");
          return { Component };
        },
      },
      {
        path: "post/:postId",
        handle: { title: "post" },
        async lazy() {
          const { default: Component } =
            await import("pages/post/{postId}/Index");
          return { Component };
        },
      },
      {
        path: "signup",
        handle: { title: "signUp" },
        async lazy() {
          const { default: Component } = await import("pages/signup/Index");
          return { Component };
        },
      },
      {
        path: "login",
        handle: { title: "logIn" },
        async lazy() {
          const { default: Component } = await import("pages/login/Index");
          return { Component };
        },
      },
      {
        path: "checkout-error",
        handle: { title: "checkoutError" },
        async lazy() {
          const { default: Component } =
            await import("pages/checkout-error/Index");
          return {
            Component: () => <Component />,
          };
        },
      },
      {
        path: "password-reset",
        handle: { title: "passwordReset" },
        async lazy() {
          const { default: Component } =
            await import("pages/password-reset/Index");
          return { Component };
        },
      },
      {
        path: "email-confirmation",
        handle: { title: "emailConfirmation" },
        async lazy() {
          const { default: Component } =
            await import("pages/email-confirmation/Index");
          return { Component };
        },
      },
      {
        path: "confirm-email-change",
        handle: { title: "confirmEmailChange" },
        async lazy() {
          const { default: Component } =
            await import("pages/confirm-email-change/Index");
          return { Component };
        },
      },
      {
        async lazy() {
          const { default: AccountContainer } =
            await import("pages/account/Layout");
          return {
            Component: () => (
              <AuthWrapper>
                <AccountContainer />
              </AuthWrapper>
            ),
          };
        },
        children: [
          {
            path: "account",
            handle: { title: "account" },
            async lazy() {
              const { default: Component } =
                await import("pages/account/Index");
              return { Component };
            },
          },
          {
            path: "fulfillment",
            handle: { title: "fulfillment" },
            async lazy() {
              const { default: Component } =
                await import("pages/fulfillment/Index");
              return { Component };
            },
          },
          {
            path: "sales",
            handle: { title: "sales" },
            async lazy() {
              const { default: Component } = await import("pages/sales/Index");
              return { Component };
            },
          },
          {
            path: "account/label",
            handle: { title: "labelSettings" },
            async lazy() {
              const { default: Component } =
                await import("pages/account/label/Index");
              return { Component };
            },
          },
        ],
      },
      {
        path: "profile",
        async lazy() {
          const { default: ProfileContainer } =
            await import("pages/profile/Layout");
          return {
            Component: () => (
              <AuthWrapper>
                <ProfileContainer />
              </AuthWrapper>
            ),
          };
        },
        children: [
          {
            path: "",
            element: <Navigate to="/profile/followed" replace />,
          },
          {
            path: "followed",
            handle: { title: "followed" },
            async lazy() {
              const { default: Component } =
                await import("pages/profile/followed/Index");
              return { Component };
            },
          },
          {
            path: "label",
            element: <Navigate to="/account/label" replace />,
          },
          {
            path: "collection",
            handle: { title: "collection" },
            async lazy() {
              const { default: Component } =
                await import("pages/profile/collection/Index");
              return { Component };
            },
          },
          {
            path: "wishlist",
            handle: { title: "wishlist" },
            async lazy() {
              const { default: Component } =
                await import("pages/profile/wishlist/Index");
              return { Component };
            },
          },
          {
            path: "notifications",
            handle: { title: "notifications" },
            async lazy() {
              const { default: Component } =
                await import("pages/profile/notifications/Index");
              return { Component };
            },
          },
          {
            path: "purchases",
            handle: { title: "purchases" },
            async lazy() {
              const { default: Component } =
                await import("pages/profile/purchases/Index");
              return { Component };
            },
          },
          {
            path: "billing",
            handle: { title: "billing" },
            async lazy() {
              const { default: Component } =
                await import("pages/profile/billing/Index");
              return { Component };
            },
          },
        ],
      },
      {
        path: "label/:labelSlug",
        element: (
          <>
            {() => {
              const { labelSlug } = useParams();
              return <Navigate to={`/${labelSlug}`} />;
            }}
          </>
        ),
      },
      {
        path: "manage",
        async lazy() {
          const { default: ManageContainer } =
            await import("pages/manage/Layout");
          return {
            Component: () => (
              <AuthWrapper>
                <CanCreateArtists>
                  <ManageContainer />
                </CanCreateArtists>
              </AuthWrapper>
            ),
          };
        },
        children: [
          {
            path: "",
            handle: { title: "manageArtists" },
            async lazy() {
              const { default: Component } = await import("pages/manage/Index");
              return { Component };
            },
          },
          {
            path: "welcome",
            handle: { title: "manageWelcome" },
            async lazy() {
              const { default: Component } =
                await import("pages/manage/welcome/Index");
              return { Component };
            },
          },
          {
            path: "bulk-track-upload",
            handle: { title: "bulkTrackUpload" },
            async lazy() {
              const { default: Component } =
                await import("pages/manage/bulk-track-upload/Index");
              return { Component };
            },
          },
          {
            path: "fundraiser/:fundraiserId/pledges",
            handle: { title: "manageFundraiserPledges" },
            async lazy() {
              const { default: Component } =
                await import("pages/manage/fundraiser/{fundraiserId}/pledges/Index");
              return { Component };
            },
          },
          {
            path: "artists/:artistId",
            async lazy() {
              const { default: Component } =
                await import("pages/manage/artists/{artistId}/Layout");
              return { Component };
            },
            children: [
              {
                path: "",
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/{artistId}/Index");
                  return { Component };
                },
                children: [
                  {
                    path: "",
                    element: <Navigate to="releases" replace={true} />,
                  },
                  {
                    path: "customize",
                    handle: { title: "manageCustomize" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/{artistId}/customize/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "roster",
                    handle: { title: "manageRoster" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/{artistId}/roster/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "releases",
                    handle: { title: "manageReleases" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/{artistId}/releases/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "tiers",
                    handle: { title: "manageTiers" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/{artistId}/tiers/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "tiers/supporters",
                    handle: { title: "manageSupporters" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/{artistId}/tiers/supporters/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "pos",
                    handle: { title: "managePos" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/{artistId}/pos/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "posts",
                    handle: { title: "managePosts" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/{artistId}/posts/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "merch",
                    children: [
                      {
                        path: "",
                        handle: { title: "manageMerch" },
                        async lazy() {
                          const { default: Component } =
                            await import("pages/manage/artists/{artistId}/merch/Index");
                          return { Component };
                        },
                      },
                    ],
                  },

                  {
                    path: "releases/tools",
                    handle: { title: "manageReleaseTools" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/{artistId}/releases/tools/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "pricing",
                    handle: { title: "managePricing" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/{artistId}/pricing/Index");
                      return { Component };
                    },
                  },
                ],
              },
              {
                path: "links",
                handle: { title: "manageLinks" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/{artistId}/links/Index");
                  return { Component };
                },
              },
              {
                path: "release/:trackGroupId",
                handle: { title: "manageRelease" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/{artistId}/release/{trackGroupId}/Index");
                  return { Component };
                },
              },
              {
                path: "merch/:merchId",
                handle: { title: "manageMerchItem" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/{artistId}/merch/{merchId}/Index");
                  return { Component };
                },
              },
              {
                path: "tiers/:tierId",
                handle: { title: "manageTier" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/{artistId}/tiers/{tierId}/Index");
                  return { Component };
                },
              },
              {
                path: "post/:postId",
                handle: { title: "managePost" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/{artistId}/post/{postId}/Index");
                  return { Component };
                },
              },
            ],
          },
        ],
      },
      {
        path: "flagged-content",
        handle: { title: "flaggedContent" },
        async lazy() {
          const { default: FlaggedContent } =
            await import("pages/flagged-content/Index");
          return {
            Component: () => (
              <AuthWrapper adminOnly>
                <FlaggedContent />
              </AuthWrapper>
            ),
          };
        },
      },
      {
        path: "admin",
        async lazy() {
          const { default: Admin } = await import("pages/admin/Layout");
          return {
            Component: () => (
              <AuthWrapper adminOnly>
                <Admin />
              </AuthWrapper>
            ),
          };
        },
        children: [
          {
            index: true,
            Component: () => <Navigate to="dashboard" replace />,
          },
          {
            path: "tasks",
            handle: { title: "adminTasks" },
            async lazy() {
              const { default: Component } =
                await import("pages/admin/tasks/Index");
              return { Component };
            },
            children: [
              {
                path: "server-tasks",
                handle: { title: "adminServerTasks" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/tasks/server-tasks/Index");
                  return { Component };
                },
              },
              {
                path: "fundraising",
                handle: { title: "adminFundraising" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/tasks/fundraising/Index");
                  return { Component };
                },
              },
            ],
          },
          {
            path: "transactions",
            handle: { title: "adminTransactions" },
            async lazy() {
              const { default: Component } =
                await import("pages/admin/transactions/Index");
              return { Component };
            },
            children: [
              {
                path: "purchases",
                handle: { title: "adminPurchases" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/transactions/purchases/Index");
                  return { Component };
                },
              },
              {
                path: "tips",
                handle: { title: "adminTips" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/transactions/tips/Index");
                  return { Component };
                },
              },
              {
                path: "subscriptions",
                handle: { title: "adminSubscriptions" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/transactions/subscriptions/Index");
                  return { Component };
                },
              },
              {
                path: "fundraiser-pledges",
                handle: { title: "adminFundraiserPledges" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/transactions/fundraiser-pledges/Index");
                  return { Component };
                },
              },
            ],
          },
          {
            path: "dashboard",
            handle: { title: "adminDashboard" },
            async lazy() {
              const { default: Component } =
                await import("pages/admin/dashboard/Index");
              return { Component };
            },
          },
          {
            path: "content",
            handle: { title: "adminContent" },
            async lazy() {
              const { default: Component } =
                await import("pages/admin/content/Index");
              return { Component };
            },
            children: [
              {
                path: "users",
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/users/Layout");
                  return { Component };
                },
                children: [
                  {
                    path: "",
                    handle: { title: "adminUsers" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/admin/users/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "invites",
                    handle: { title: "adminUserInvites" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/admin/users/invites/Index");
                      return { Component };
                    },
                  },
                  {
                    path: ":id",
                    handle: { title: "adminUser" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/admin/users/{id}/Index");
                      return { Component };
                    },
                  },
                ],
              },
              {
                path: "artists",
                children: [
                  {
                    path: "",
                    handle: { title: "adminArtists" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/admin/artists/Index");
                      return { Component };
                    },
                  },
                  {
                    path: ":id",
                    handle: { title: "adminArtist" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/admin/artists/{id}/Index");
                      return { Component };
                    },
                  },
                ],
              },
              {
                path: "track-groups/:id",
                handle: { title: "adminTrackGroup" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/track-groups/{id}/Index");
                  return { Component };
                },
              },
              {
                path: "track-groups",
                handle: { title: "adminTrackGroups" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/track-groups/Index");
                  return { Component };
                },
              },
              {
                path: "tracks",
                handle: { title: "adminTracks" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/tracks/Index");
                  return { Component };
                },
              },
            ],
          },
          {
            path: "licenses",
            handle: { title: "adminLicenses" },
            async lazy() {
              const { default: Component } =
                await import("pages/admin/licenses/Index");
              return { Component };
            },
          },
          {
            path: "settings",
            handle: { title: "adminSettings" },
            async lazy() {
              const { default: Component } =
                await import("pages/admin/settings/Index");
              return { Component };
            },
          },
          {
            path: "clients",
            handle: { title: "adminClients" },
            async lazy() {
              const { default: Component } =
                await import("pages/admin/clients/Index");
              return { Component };
            },
          },
          {
            path: "send-emails",
            handle: { title: "adminSendEmails" },
            async lazy() {
              const { default: Component } =
                await import("pages/admin/send-emails/Index");
              return { Component };
            },
          },
        ],
      },
      {
        path: "releases",
        handle: { title: "releases" },
        async lazy() {
          const { default: Releases } = await import("pages/releases/Index");
          return {
            Component: () => (
              <div
                className={css`
                  width: 100%;
                `}
              >
                <Releases />
              </div>
            ),
          };
        },
      },
      {
        path: "search",
        children: [
          {
            path: "",
            handle: { title: "search" },
            async lazy() {
              const { default: SearchResults } =
                await import("pages/search/Index");
              return {
                Component: () => (
                  <div
                    className={css`
                      width: 100%;
                    `}
                  >
                    <SearchResults />
                  </div>
                ),
              };
            },
          },
          {
            path: "locations/:locationSlug",
            handle: { title: "searchLocation" },
            async lazy() {
              const { default: LocationResults } =
                await import("pages/search/locations/{locationSlug}/Index");
              return {
                Component: () => (
                  <div
                    className={css`
                      width: 100%;
                    `}
                  >
                    <LocationResults />
                  </div>
                ),
              };
            },
          },
        ],
      },
      {
        path: "tags",
        handle: { title: "tags" },
        async lazy() {
          const { default: Tags } = await import("pages/tags/Index");
          return {
            Component: () => (
              <div
                className={css`
                  width: 100%;
                `}
              >
                <Tags />
              </div>
            ),
          };
        },
      },
      {
        path: "artists",
        handle: { title: "artists" },
        async lazy() {
          const { default: Artists } = await import("pages/artists/Index");
          return {
            Component: () => (
              <div
                className={css`
                  width: 100%;
                `}
              >
                <Artists />
              </div>
            ),
          };
        },
      },
      {
        path: ":artistId/links",
        handle: { title: "artistLinks" },
        async lazy() {
          const { default: Component } =
            await import("pages/{artistId}/links/Index");
          return { Component };
        },
      },
      {
        path: ":artistId",
        async lazy() {
          const { default: Component } =
            await import("pages/{artistId}/Layout");
          return { Component };
        },
        children: [
          {
            path: "",
            async lazy() {
              const { default: Component } =
                await import("pages/{artistId}/Index");
              return { Component };
            },
            children: [
              {
                path: "connect",
                handle: { title: "artistConnect" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/{artistId}/connect/Index");
                  return { Component };
                },
              },
              {
                // Legacy path: the page now covers following too, not just tips.
                path: "tip",
                element: <Navigate to="../connect" replace />,
              },
              {
                path: "posts",
                handle: { title: "artistPosts" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/{artistId}/posts/Index");
                  return { Component };
                },
              },
              {
                path: "merch",
                children: [
                  {
                    path: ":merchId",
                    handle: { title: "artistMerchItem" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/{artistId}/merch/{merchId}/Index");
                      return {
                        Component: () => <Component />,
                      };
                    },
                  },
                  {
                    path: "",
                    handle: { title: "artistMerch" },
                    async lazy() {
                      const { default: Component } =
                        await import("pages/{artistId}/merch/Index");
                      return {
                        Component: () => <Component />,
                      };
                    },
                  },
                ],
              },
              {
                path: "checkout-complete",
                handle: { title: "checkoutComplete" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/{artistId}/checkout-complete/Index");
                  return {
                    Component: () => <Component />,
                  };
                },
              },
              {
                path: "checkout-error",
                handle: { title: "checkoutError" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/{artistId}/checkout-error/Index");
                  return {
                    Component: () => <Component />,
                  };
                },
              },
              {
                path: "roster",
                handle: { title: "artistRoster" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/{artistId}/roster/Index");
                  return { Component };
                },
              },
              {
                path: "releases",
                handle: { title: "artistReleases" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/{artistId}/releases/Index");
                  return { Component };
                },
              },
              {
                path: "support",
                handle: { title: "artistSupport" },
                async lazy() {
                  const { default: Component } =
                    await import("pages/{artistId}/support/Index");
                  return { Component };
                },
              },
            ],
          },
          {
            path: "unsubscribe",
            handle: { title: "artistUnsubscribe" },
            async lazy() {
              const { default: Component } =
                await import("pages/{artistId}/unsubscribe/Index");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId",
            handle: { title: "release" },
            async lazy() {
              const { default: Component } =
                await import("pages/{artistId}/release/{trackGroupId}/Index");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/redeem",
            handle: { title: "redeemDownloadCode" },
            async lazy() {
              const { default: Component } =
                await import("pages/{artistId}/release/{trackGroupId}/redeem/Index");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/download",
            handle: { title: "downloadRelease" },
            async lazy() {
              const { default: Component } =
                await import("pages/{artistId}/release/{trackGroupId}/download/Index");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/tracks/:trackId/download",
            handle: { title: "downloadTrack" },
            async lazy() {
              const { default: Component } =
                await import("pages/{artistId}/release/{trackGroupId}/tracks/{trackId}/download/Index");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/tracks/:trackId",
            handle: { title: "track" },
            async lazy() {
              const { default: Component } =
                await import("pages/{artistId}/release/{trackGroupId}/tracks/{trackId}/Index");
              return { Component };
            },
          },
          {
            path: "posts/:postId",
            handle: { title: "artistPost" },
            async lazy() {
              const { default: Component } =
                await import("pages/{artistId}/posts/{postId}/Index");
              return { Component };
            },
          },
        ],
      },
    ],
  },
];

export default routes;
