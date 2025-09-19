import { Navigate, useParams, type RouteObject } from "react-router-dom";

import App from "./App";
import ErrorPage from "./components/ErrorPage";
import { AuthWrapper } from "components/AuthWrapper";
import { css } from "@emotion/css";
import CanCreateArtists from "components/CanCreateArtists";

async function markdownPage(source: string) {
  const { PageMarkdownWrapper } = await import("components/Post");
  const { default: MarkdownContent } = await import(
    "components/common/MarkdownContent"
  );

  return {
    Component: () => (
      <PageMarkdownWrapper>
        <MarkdownContent source={source} />
      </PageMarkdownWrapper>
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
          const { default: Component } = await import("components/pages/About");
          return { Component };
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
          const { default: Component } = await import(
            "components/Home/Features"
          );
          return { Component };
        },
      },
      {
        path: "widget/track/:id",
        async lazy() {
          const { default: Component } = await import(
            "components/Widget/TrackWidget"
          );
          return { Component };
        },
      },
      {
        path: "widget/trackgroup/:id",
        async lazy() {
          const { default: Component } = await import(
            "components/Widget/TrackGroupWidget"
          );
          return { Component };
        },
      },
      {
        path: "widget/label/:id",
        async lazy() {
          const { default: Component } = await import(
            "components/Widget/LabelWidget"
          );
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
        path: "password-reset",
        async lazy() {
          const { default: Component } = await import(
            "components/PasswordReset"
          );
          return { Component };
        },
      },
      {
        path: "profile",
        async lazy() {
          const { default: ProfileContainer } = await import(
            "components/Profile/ProfileContainer"
          );
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
            async lazy() {
              const { default: Component } = await import(
                "./components/Profile"
              );
              return { Component };
            },
          },
          {
            path: "label",
            async lazy() {
              const { default: Component } = await import(
                "components/Profile/ManageLabel"
              );
              return {
                Component: () => <Component />,
              };
            },
          },
          {
            path: "collection",
            async lazy() {
              const { default: Component } = await import(
                "components/Profile/Collection"
              );
              return { Component };
            },
          },
          {
            path: "wishlist",
            async lazy() {
              const { default: Component } = await import(
                "components/Profile/WishlistCollection"
              );
              return { Component };
            },
          },
          {
            path: "notifications",
            async lazy() {
              const { default: Component } = await import(
                "components/Profile/UserNotificationFeed"
              );
              return { Component };
            },
          },
          {
            path: "purchases",
            async lazy() {
              const { default: Component } = await import(
                "components/Profile/YourPurchases"
              );
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
          const { default: ManageContainer } = await import(
            "components/ManageArtist/ManageContainer"
          );
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
              const { default: Component } = await import(
                "./components/ManageArtist/Manage"
              );
              return { Component };
            },
          },
          {
            path: "welcome",
            async lazy() {
              const { default: Component } = await import(
                "components/ManageArtist/Welcome"
              );
              return { Component };
            },
          },
          {
            path: "artists/:artistId",
            async lazy() {
              const { default: Component } = await import(
                "components/ManageArtist/ManageArtistContainer"
              );
              return { Component };
            },
            children: [
              {
                path: "",
                async lazy() {
                  const { default: Component } = await import(
                    "components/ManageArtist/ManageArtist"
                  );
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
                      const { default: Component } = await import(
                        "components/ManageArtist/ManageArtistDetails/CustomizeLook"
                      );
                      return { Component };
                    },
                  },
                  {
                    path: "releases",
                    async lazy() {
                      const { default: Component } = await import(
                        "components/ManageArtist/ManageArtistAlbums"
                      );
                      return { Component };
                    },
                  },
                  {
                    path: "tiers",
                    async lazy() {
                      const { default: Component } = await import(
                        "components/ManageArtist/ManageArtistSubscriptionTiers"
                      );
                      return { Component };
                    },
                  },
                  {
                    path: "tiers/supporters",
                    async lazy() {
                      const { default: Component } = await import(
                        "components/ManageArtist/Supporters"
                      );
                      return { Component };
                    },
                  },
                  {
                    path: "posts",
                    async lazy() {
                      const { default: Component } = await import(
                        "components/ManageArtist/Posts/ManageArtistPosts"
                      );
                      return { Component };
                    },
                  },
                  {
                    path: "merch",
                    children: [
                      {
                        path: "",
                        async lazy() {
                          const { default: Component } = await import(
                            "components/ManageArtist/Merch/ManageMerch"
                          );
                          return { Component };
                        },
                      },
                      {
                        path: ":merchId",
                        async lazy() {
                          const { default: Component } = await import(
                            "components/ManageArtist/Merch/EditMerch"
                          );
                          return { Component };
                        },
                      },
                    ],
                  },

                  {
                    path: "releases/tools",
                    async lazy() {
                      const { default: Component } = await import(
                        "components/ManageArtist/ManageArtistAlbumTools"
                      );
                      return { Component };
                    },
                  },
                ],
              },
              {
                path: "release/:trackGroupId",
                async lazy() {
                  const { default: Component } = await import(
                    "components/ManageArtist/ManageTrackGroup/ManageTrackGroup"
                  );
                  return { Component };
                },
              },
              {
                path: "post/:postId",
                async lazy() {
                  const { default: Component } = await import(
                    "components/ManageArtist/Posts/ManagePost"
                  );
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
            path: "transactions",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminTransactions"
              );
              return { Component };
            },
            children: [
              {
                path: "purchases",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Admin/AdminPurchases"
                  );
                  return { Component };
                },
              },
              {
                path: "tips",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Admin/AdminTips"
                  );
                  return { Component };
                },
              },
              {
                path: "subscriptions",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Admin/AdminSubscriptions"
                  );
                  return { Component };
                },
              },
            ],
          },
          {
            path: "dashboard",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminDashboard"
              );
              return { Component };
            },
          },
          {
            path: "fundraising",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminFundraising"
              );
              return { Component };
            },
          },
          {
            path: "users",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminUsers"
              );
              return { Component };
            },
            children: [
              {
                path: "",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Admin/AdminUsersList"
                  );
                  return { Component };
                },
              },
              {
                path: "invites",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Admin/AdminInvitesList"
                  );
                  return { Component };
                },
              },
              {
                path: ":id",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Admin/AdminManageUser"
                  );
                  return { Component };
                },
              },
            ],
          },

          {
            path: "artists",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminArtists"
              );
              return { Component };
            },
          },
          {
            path: "trackGroups",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminTrackgroups"
              );
              return { Component };
            },
          },
          {
            path: "tracks",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminTracks"
              );
              return { Component };
            },
          },

          {
            path: "serverTasks",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/CallServerTasks"
              );
              return { Component };
            },
          },
          {
            path: "licenses",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminLicenses"
              );
              return { Component };
            },
          },
          {
            path: "settings",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminSettings"
              );
              return { Component };
            },
          },
          {
            path: "sendEmails",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminSendEmail"
              );
              return { Component };
            },
          },
        ],
      },
      {
        path: "fulfillment",
        async lazy() {
          const { default: Fulfillment } = await import(
            "components/FulFillment/Fulfillment"
          );
          return {
            Component: () => (
              <AuthWrapper>
                <Fulfillment />
              </AuthWrapper>
            ),
          };
        },
      },
      {
        path: "sales",
        async lazy() {
          const { default: Sales } = await import("components/Sales/Sales");
          return {
            Component: () => (
              <AuthWrapper>
                <Sales />
              </AuthWrapper>
            ),
          };
        },
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
          const { default: Component } = await import(
            "components/Artist/ArtistLinks"
          );
          return { Component };
        },
      },
      {
        path: ":artistId",
        async lazy() {
          const { default: Component } = await import(
            "components/Artist/ArtistContainer"
          );
          return { Component };
        },
        children: [
          {
            path: "",
            async lazy() {
              const { default: Component } = await import(
                "components/Artist/Artist"
              );
              return { Component };
            },
            children: [
              {
                path: "tip",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Artist/ArtistTip"
                  );
                  return { Component };
                },
              },
              {
                path: "posts",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Artist/ArtistPosts"
                  );
                  return { Component };
                },
              },
              {
                path: "merch",
                children: [
                  {
                    path: ":merchId",
                    async lazy() {
                      const { default: Component } = await import(
                        "components/Merch/MerchView"
                      );
                      return {
                        Component: () => <Component />,
                      };
                    },
                  },
                  {
                    path: "",
                    async lazy() {
                      const { default: Component } = await import(
                        "components/Merch/ArtistMerch"
                      );
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
                  const { default: Component } = await import(
                    "components/Artist/CheckoutComplete"
                  );
                  return {
                    Component: () => <Component />,
                  };
                },
              },
              {
                path: "roster",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Label/Roster"
                  );
                  return { Component };
                },
              },
              {
                path: "releases",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Artist/ArtistAlbums"
                  );
                  return { Component };
                },
              },
              {
                path: "support",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Artist/ArtistSupport"
                  );
                  return { Component };
                },
              },
            ],
          },
          {
            path: "unsubscribe",
            async lazy() {
              const { default: Component } = await import(
                "components/Artist/ArtistUnsubscribe"
              );
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId",
            async lazy() {
              const { default: Component } = await import(
                "components/TrackGroup/TrackGroup"
              );
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/redeem",
            async lazy() {
              const { default: Component } = await import(
                "components/TrackGroup/RedeemCode"
              );
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/download",
            async lazy() {
              const { default: Component } = await import(
                "components/TrackGroup/DownloadAlbum"
              );
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/tracks/:trackId/download",
            async lazy() {
              const { default: Component } = await import(
                "components/TrackGroup/DownloadTrack"
              );
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/tracks/:trackId",
            async lazy() {
              const { default: Component } = await import(
                "components/TrackGroup/TrackView"
              );
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
