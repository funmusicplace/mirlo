import { Navigate, type RouteObject } from "react-router-dom";

import App from "./App";
import ErrorPage from "./components/ErrorPage";
import { AuthWrapper } from "components/AuthWrapper";
import { css } from "@emotion/css";

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
        lazy: () => markdownPage("/pages/CookiePolicy.md"),
      },
      {
        path: "pages/privacy",
        lazy: () => markdownPage("/pages/Privacy.md"),
      },
      {
        path: "pages/en/faq",
        lazy: () => markdownPage("/pages/en/FAQ.md"),
      },
      {
        path: "pages/terms",
        lazy: () => markdownPage("/pages/Terms.md"),
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
        ],
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
                <ManageContainer />
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
                        "components/ManageArtist/ManageArtistPosts"
                      );
                      return { Component };
                    },
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
                    "components/ManageArtist/ManageTrackGroup"
                  );
                  return { Component };
                },
              },
              {
                path: "post/:postId",
                async lazy() {
                  const { default: Component } = await import(
                    "components/ManageArtist/ManagePost"
                  );
                  return { Component };
                },
              },
              {
                path: "new-release",
                async lazy() {
                  const { default: Component } = await import(
                    "components/ManageArtist/NewReleaseRedirect"
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
            path: "users",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/Users"
              );
              return { Component };
            },
          },
          {
            path: "users/:id",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminManageUser"
              );
              return { Component };
            },
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
                "components/Admin/Tracks"
              );
              return { Component };
            },
          },
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
            path: "subscriptions",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminSubscriptions"
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
            path: "settings",
            async lazy() {
              const { default: Component } = await import(
                "components/Admin/AdminSettings"
              );
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
                path: "posts",
                async lazy() {
                  const { default: Component } = await import(
                    "components/Artist/ArtistPosts"
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
