import { css } from "@emotion/css";
import { AuthWrapper } from "components/AuthWrapper";
import CanCreateArtists from "components/CanCreateArtists";
import { Navigate, useParams, type RouteObject } from "react-router-dom";

import App from "./App";
import ErrorPage from "./components/ErrorPage";

async function markdownPage(source: string) {
  const { PageMarkdownWrapper } = await import("components/Post");
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
          const { default: Component } = await import("components/Home/Home");
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
        lazy: () => markdownPage("cookie-policy"),
      },
      {
        path: "pages/privacy",
        lazy: () => markdownPage("privacy"),
      },
      {
        path: "pages/terms",
        lazy: () => markdownPage("terms"),
      },
      {
        path: "pages/content-policy",
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
        path: "widget/track/:id",
        async lazy() {
          const { default: Component } =
            await import("components/Widget/TrackWidget");
          return { Component };
        },
      },
      {
        path: "widget/trackgroup/:id",
        async lazy() {
          const { default: Component } =
            await import("components/Widget/TrackGroupWidget");
          return { Component };
        },
      },
      {
        path: "widget/post/:id",
        async lazy() {
          const { default: Component } =
            await import("components/Widget/PostWidget");
          return { Component };
        },
      },
      {
        path: "widget/label/:id",
        async lazy() {
          const { default: Component } =
            await import("components/Widget/LabelWidget");
          return { Component };
        },
      },
      {
        path: "post/:postId",
        async lazy() {
          const { default: Component } = await import("components/Post");
          return { Component };
        },
      },
      {
        path: "signup",
        async lazy() {
          const { default: Component } = await import("components/Signup");
          return { Component };
        },
      },
      {
        path: "login",
        async lazy() {
          const { default: Component } = await import("./components/Login");
          return { Component };
        },
      },
      {
        path: "checkout-error",
        async lazy() {
          const { default: Component } =
            await import("components/Checkout/CheckoutError");
          return {
            Component: () => <Component />,
          };
        },
      },
      {
        path: "password-reset",
        async lazy() {
          const { default: Component } =
            await import("components/PasswordReset");
          return { Component };
        },
      },
      {
        path: "email-confirmation",
        async lazy() {
          const { default: Component } =
            await import("components/EmailConfirmation");
          return { Component };
        },
      },
      {
        path: "confirm-email-change",
        async lazy() {
          const { default: Component } =
            await import("components/ConfirmEmailChange");
          return { Component };
        },
      },
      {
        async lazy() {
          const { default: AccountContainer } =
            await import("components/Account/AccountContainer");
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
            async lazy() {
              const { default: Component } =
                await import("components/Account/AccountSettings");
              return { Component };
            },
          },
          {
            path: "fulfillment",
            async lazy() {
              const { default: Component } =
                await import("components/FulFillment/Fulfillment");
              return { Component };
            },
          },
          {
            path: "sales",
            async lazy() {
              const { default: Component } =
                await import("components/Sales/Sales");
              return { Component };
            },
          },
          {
            path: "account/label",
            async lazy() {
              const { default: Component } =
                await import("components/Profile/ManageLabel");
              return { Component };
            },
          },
        ],
      },
      {
        path: "profile",
        async lazy() {
          const { default: ProfileContainer } =
            await import("components/Profile/ProfileContainer");
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
            async lazy() {
              const { default: Component } =
                await import("./components/Profile");
              return { Component };
            },
          },
          {
            path: "label",
            element: <Navigate to="/account/label" replace />,
          },
          {
            path: "collection",
            async lazy() {
              const { default: Component } =
                await import("components/Profile/Collection");
              return { Component };
            },
          },
          {
            path: "wishlist",
            async lazy() {
              const { default: Component } =
                await import("components/Profile/WishlistCollection");
              return { Component };
            },
          },
          {
            path: "notifications",
            async lazy() {
              const { default: Component } =
                await import("components/Profile/UserNotificationFeed");
              return { Component };
            },
          },
          {
            path: "purchases",
            async lazy() {
              const { default: Component } =
                await import("components/Profile/YourPurchases");
              return { Component };
            },
          },
          {
            path: "billing",
            async lazy() {
              const { default: Component } =
                await import("components/Profile/Billing");
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
            await import("components/ManageArtist/ManageContainer");
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
            async lazy() {
              const { default: Component } =
                await import("./components/ManageArtist/Manage");
              return { Component };
            },
          },
          {
            path: "welcome",
            async lazy() {
              const { default: Component } =
                await import("components/ManageArtist/Welcome");
              return { Component };
            },
          },
          {
            path: "bulkTrackUpload",
            async lazy() {
              const { default: Component } =
                await import("components/ManageArtist/TrackUpload/BulkTrackUpload");
              return { Component };
            },
          },
          {
            path: "fundraiser/:fundraiserId/pledges",
            async lazy() {
              const { default: Component } =
                await import("components/ManageArtist/FundraiserPledges");
              return { Component };
            },
          },
          {
            path: "artists/:artistId",
            async lazy() {
              const { default: Component } =
                await import("components/ManageArtist/ManageArtistContainer");
              return { Component };
            },
            children: [
              {
                path: "",
                async lazy() {
                  const { default: Component } =
                    await import("components/ManageArtist/ManageArtist");
                  return { Component };
                },
                children: [
                  {
                    path: "",
                    element: <Navigate to="releases" replace={true} />,
                  },
                  {
                    path: "customize",
                    async lazy() {
                      const { default: Component } =
                        await import("components/ManageArtist/ManageArtistDetails/CustomizeLook");
                      return { Component };
                    },
                  },
                  {
                    path: "roster",
                    async lazy() {
                      const { default: Component } =
                        await import("components/ManageArtist/ManageArtistRoster");
                      return { Component };
                    },
                  },
                  {
                    path: "releases",
                    async lazy() {
                      const { default: Component } =
                        await import("components/ManageArtist/ManageArtistAlbums");
                      return { Component };
                    },
                  },
                  {
                    path: "tiers",
                    async lazy() {
                      const { default: Component } =
                        await import("components/ManageArtist/ManageArtistSubscriptionTiers");
                      return { Component };
                    },
                  },
                  {
                    path: "tiers/supporters",
                    async lazy() {
                      const { default: Component } =
                        await import("components/ManageArtist/Supporters");
                      return { Component };
                    },
                  },
                  {
                    path: "pos",
                    async lazy() {
                      const { default: Component } =
                        await import("components/ManageArtist/POS/ManagePOS");
                      return { Component };
                    },
                  },
                  {
                    path: "posts",
                    async lazy() {
                      const { default: Component } =
                        await import("components/ManageArtist/Posts/ManageArtistPosts");
                      return { Component };
                    },
                  },
                  {
                    path: "merch",
                    children: [
                      {
                        path: "",
                        async lazy() {
                          const { default: Component } =
                            await import("components/ManageArtist/Merch/ManageMerch");
                          return { Component };
                        },
                      },
                    ],
                  },

                  {
                    path: "releases/tools",
                    async lazy() {
                      const { default: Component } =
                        await import("components/ManageArtist/ManageArtistAlbumTools");
                      return { Component };
                    },
                  },
                  {
                    path: "pricing",
                    async lazy() {
                      const { default: Component } =
                        await import("components/ManageArtist/ManageArtistPricing");
                      return { Component };
                    },
                  },
                ],
              },
              {
                path: "links",
                async lazy() {
                  const { default: Component } =
                    await import("components/ManageArtist/ManageArtistLinks");
                  return { Component };
                },
              },
              {
                path: "release/:trackGroupId",
                async lazy() {
                  const { default: Component } =
                    await import("components/ManageArtist/ManageTrackGroup/ManageTrackGroup");
                  return { Component };
                },
              },
              {
                path: "merch/:merchId",
                async lazy() {
                  const { default: Component } =
                    await import("components/ManageArtist/Merch/EditMerch");
                  return { Component };
                },
              },
              {
                path: "tiers/:tierId",
                async lazy() {
                  const { default: Component } =
                    await import("components/ManageArtist/ManageSubscriptionTierPage");
                  return { Component };
                },
              },
              {
                path: "post/:postId",
                async lazy() {
                  const { default: Component } =
                    await import("components/ManageArtist/Posts/ManagePost");
                  return { Component };
                },
              },
            ],
          },
        ],
      },
      {
        path: "admin",
        async lazy() {
          const { default: Admin } = await import("components/Admin/Admin");
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
            async lazy() {
              const { default: Component } =
                await import("components/Admin/AdminServerTasks");
              return { Component };
            },
            children: [
              {
                path: "serverTasks",
                async lazy() {
                  const { default: Component } =
                    await import("components/Admin/CallServerTasks");
                  return { Component };
                },
              },
              {
                path: "fundraising",
                async lazy() {
                  const { default: Component } =
                    await import("components/Admin/AdminFundraising");
                  return { Component };
                },
              },
            ],
          },
          {
            path: "transactions",
            async lazy() {
              const { default: Component } =
                await import("components/Admin/AdminTransactions");
              return { Component };
            },
            children: [
              {
                path: "purchases",
                async lazy() {
                  const { default: Component } =
                    await import("components/Admin/AdminPurchases");
                  return { Component };
                },
              },
              {
                path: "tips",
                async lazy() {
                  const { default: Component } =
                    await import("components/Admin/AdminTips");
                  return { Component };
                },
              },
              {
                path: "subscriptions",
                async lazy() {
                  const { default: Component } =
                    await import("components/Admin/AdminSubscriptions");
                  return { Component };
                },
              },
              {
                path: "fundraiser-pledges",
                async lazy() {
                  const { default: Component } =
                    await import("components/Admin/AdminFundraiserPledges");
                  return { Component };
                },
              },
            ],
          },
          {
            path: "dashboard",
            async lazy() {
              const { default: Component } =
                await import("components/Admin/AdminDashboard");
              return { Component };
            },
          },
          {
            path: "users",
            async lazy() {
              const { default: Component } =
                await import("components/Admin/AdminUsers");
              return { Component };
            },
            children: [
              {
                path: "",
                async lazy() {
                  const { default: Component } =
                    await import("components/Admin/AdminUsersList");
                  return { Component };
                },
              },
              {
                path: "invites",
                async lazy() {
                  const { default: Component } =
                    await import("components/Admin/AdminInvitesList");
                  return { Component };
                },
              },
              {
                path: ":id",
                async lazy() {
                  const { default: Component } =
                    await import("components/Admin/AdminManageUser");
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
                async lazy() {
                  const { default: Component } =
                    await import("components/Admin/AdminArtists");
                  return { Component };
                },
              },
              {
                path: ":id",
                async lazy() {
                  const { default: Component } =
                    await import("components/Admin/AdminManageArtist");
                  return { Component };
                },
              },
            ],
          },
          {
            path: "trackGroups/:id",
            async lazy() {
              const { default: Component } =
                await import("components/Admin/TrackgroupDetails");
              return { Component };
            },
          },
          {
            path: "trackGroups",
            async lazy() {
              const { default: Component } =
                await import("components/Admin/AdminTrackgroups");
              return { Component };
            },
          },

          {
            path: "tracks",
            async lazy() {
              const { default: Component } =
                await import("components/Admin/AdminTracks");
              return { Component };
            },
          },
          {
            path: "licenses",
            async lazy() {
              const { default: Component } =
                await import("components/Admin/AdminLicenses");
              return { Component };
            },
          },
          {
            path: "settings",
            async lazy() {
              const { default: Component } =
                await import("components/Admin/AdminSettings");
              return { Component };
            },
          },
          {
            path: "sendEmails",
            async lazy() {
              const { default: Component } =
                await import("components/Admin/AdminSendEmail");
              return { Component };
            },
          },
        ],
      },
      {
        path: "releases",
        async lazy() {
          const { default: Releases } = await import("components/Releases");
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
            async lazy() {
              const { default: SearchResults } =
                await import("components/SearchResults");
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
            async lazy() {
              const { default: LocationResults } =
                await import("components/LocationResults");
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
        async lazy() {
          const { default: Tags } = await import("components/Tags");
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
        async lazy() {
          const { default: Artists } = await import("components/Artists");
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
        async lazy() {
          const { default: Component } =
            await import("components/Artist/ArtistLinks");
          return { Component };
        },
      },
      {
        path: ":artistId",
        async lazy() {
          const { default: Component } =
            await import("components/Artist/ArtistContainer");
          return { Component };
        },
        children: [
          {
            path: "",
            async lazy() {
              const { default: Component } =
                await import("components/Artist/Artist");
              return { Component };
            },
            children: [
              {
                index: true,
                async lazy() {
                  const { default: Component } =
                    await import("components/Artist/ArtistHome");
                  return { Component };
                },
              },
              {
                path: "connect",
                async lazy() {
                  const { default: Component } =
                    await import("components/Artist/ArtistTip");
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
                async lazy() {
                  const { default: Component } =
                    await import("components/Artist/ArtistPosts");
                  return { Component };
                },
              },
              {
                path: "merch",
                children: [
                  {
                    path: ":merchId",
                    async lazy() {
                      const { default: Component } =
                        await import("components/Merch/MerchView");
                      return {
                        Component: () => <Component />,
                      };
                    },
                  },
                  {
                    path: "",
                    async lazy() {
                      const { default: Component } =
                        await import("components/Merch/ArtistMerch");
                      return {
                        Component: () => <Component />,
                      };
                    },
                  },
                ],
              },
              {
                path: "checkout-complete",
                async lazy() {
                  const { default: Component } =
                    await import("components/Artist/CheckoutComplete");
                  return {
                    Component: () => <Component />,
                  };
                },
              },
              {
                path: "checkout-error",
                async lazy() {
                  const { default: Component } =
                    await import("components/Checkout/CheckoutError");
                  return {
                    Component: () => <Component />,
                  };
                },
              },
              {
                path: "roster",
                async lazy() {
                  const { default: Component } =
                    await import("components/Label/Roster");
                  return { Component };
                },
              },
              {
                path: "releases",
                async lazy() {
                  const { default: Component } =
                    await import("components/Artist/ArtistAlbums");
                  return { Component };
                },
              },
              {
                path: "support",
                async lazy() {
                  const { default: Component } =
                    await import("components/Artist/ArtistSupport");
                  return { Component };
                },
              },
            ],
          },
          {
            path: "unsubscribe",
            async lazy() {
              const { default: Component } =
                await import("components/Artist/ArtistUnsubscribe");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId",
            async lazy() {
              const { default: Component } =
                await import("components/TrackGroup/TrackGroup");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/redeem",
            async lazy() {
              const { default: Component } =
                await import("components/TrackGroup/RedeemCode");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/download",
            async lazy() {
              const { default: Component } =
                await import("components/TrackGroup/DownloadAlbum");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/tracks/:trackId/download",
            async lazy() {
              const { default: Component } =
                await import("components/TrackGroup/DownloadTrack");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/tracks/:trackId",
            async lazy() {
              const { default: Component } =
                await import("components/TrackGroup/TrackView");
              return { Component };
            },
          },
          {
            path: "posts/:postId",
            async lazy() {
              const { default: Component } = await import("components/Post");
              return { Component };
            },
          },
          {
            path: "posts/:postId",
            async lazy() {
              const { default: Component } = await import("components/Post");
              return { Component };
            },
          },
        ],
      },
    ],
  },
];

export default routes;
