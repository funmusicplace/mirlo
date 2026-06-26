import { css } from "@emotion/css";
import { AuthWrapper } from "components/AuthWrapper";
import CanCreateArtists from "components/CanCreateArtists";
import { Navigate, useParams, type RouteObject } from "react-router-dom";

import App from "./App";
import ErrorPage from "./components/ErrorPage";

async function markdownPage(source: string) {
  const { PageMarkdownWrapper } = await import(
    "components/common/PageMarkdownWrapper"
  );
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
        path: "checkout",
        async lazy() {
          const { default: Component } =
            await import("pages/checkout/Index");
          return { Component };
        },
      },
      {
        path: "widget/track/:id",
        async lazy() {
          const { default: Component } =
            await import("pages/widget/track/:id/Index");
          return { Component };
        },
      },
      {
        path: "widget/trackgroup/:id",
        async lazy() {
          const { default: Component } =
            await import("pages/widget/trackgroup/:id/Index");
          return { Component };
        },
      },
      {
        path: "widget/post/:id",
        async lazy() {
          const { default: Component } =
            await import("pages/widget/post/:id/Index");
          return { Component };
        },
      },
      {
        path: "widget/label/:id",
        async lazy() {
          const { default: Component } =
            await import("pages/widget/label/:id/Index");
          return { Component };
        },
      },
      {
        path: "post/:postId",
        async lazy() {
          const { default: Component } = await import("pages/post/:postId/Index");
          return { Component };
        },
      },
      {
        path: "signup",
        async lazy() {
          const { default: Component } = await import("pages/signup/Index");
          return { Component };
        },
      },
      {
        path: "login",
        async lazy() {
          const { default: Component } = await import("pages/login/Index");
          return { Component };
        },
      },
      {
        path: "checkout-error",
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
        async lazy() {
          const { default: Component } =
            await import("pages/password-reset/Index");
          return { Component };
        },
      },
      {
        path: "email-confirmation",
        async lazy() {
          const { default: Component } =
            await import("pages/email-confirmation/Index");
          return { Component };
        },
      },
      {
        path: "confirm-email-change",
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
            async lazy() {
              const { default: Component } =
                await import("pages/account/Index");
              return { Component };
            },
          },
          {
            path: "fulfillment",
            async lazy() {
              const { default: Component } =
                await import("pages/fulfillment/Index");
              return { Component };
            },
          },
          {
            path: "sales",
            async lazy() {
              const { default: Component } =
                await import("pages/sales/Index");
              return { Component };
            },
          },
          {
            path: "account/label",
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
            async lazy() {
              const { default: Component } =
                await import("pages/profile/collection/Index");
              return { Component };
            },
          },
          {
            path: "wishlist",
            async lazy() {
              const { default: Component } =
                await import("pages/profile/wishlist/Index");
              return { Component };
            },
          },
          {
            path: "notifications",
            async lazy() {
              const { default: Component } =
                await import("pages/profile/notifications/Index");
              return { Component };
            },
          },
          {
            path: "purchases",
            async lazy() {
              const { default: Component } =
                await import("pages/profile/purchases/Index");
              return { Component };
            },
          },
          {
            path: "billing",
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
            async lazy() {
              const { default: Component } =
                await import("pages/manage/Index");
              return { Component };
            },
          },
          {
            path: "welcome",
            async lazy() {
              const { default: Component } =
                await import("pages/manage/welcome/Index");
              return { Component };
            },
          },
          {
            path: "bulk-track-upload",
            async lazy() {
              const { default: Component } =
                await import("pages/manage/bulk-track-upload/Index");
              return { Component };
            },
          },
          {
            path: "fundraiser/:fundraiserId/pledges",
            async lazy() {
              const { default: Component } =
                await import("pages/manage/fundraiser/:fundraiserId/pledges/Index");
              return { Component };
            },
          },
          {
            path: "artists/:artistId",
            async lazy() {
              const { default: Component } =
                await import("pages/manage/artists/:artistId/Layout");
              return { Component };
            },
            children: [
              {
                path: "",
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/:artistId/Index");
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
                        await import("pages/manage/artists/:artistId/customize/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "roster",
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/:artistId/roster/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "releases",
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/:artistId/releases/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "tiers",
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/:artistId/tiers/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "tiers/supporters",
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/:artistId/tiers/supporters/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "pos",
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/:artistId/pos/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "posts",
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/:artistId/posts/Index");
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
                            await import("pages/manage/artists/:artistId/merch/Index");
                          return { Component };
                        },
                      },
                    ],
                  },

                  {
                    path: "releases/tools",
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/:artistId/releases/tools/Index");
                      return { Component };
                    },
                  },
                  {
                    path: "pricing",
                    async lazy() {
                      const { default: Component } =
                        await import("pages/manage/artists/:artistId/pricing/Index");
                      return { Component };
                    },
                  },
                ],
              },
              {
                path: "links",
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/:artistId/links/Index");
                  return { Component };
                },
              },
              {
                path: "release/:trackGroupId",
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/:artistId/release/:trackGroupId/Index");
                  return { Component };
                },
              },
              {
                path: "merch/:merchId",
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/:artistId/merch/:merchId/Index");
                  return { Component };
                },
              },
              {
                path: "tiers/:tierId",
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/:artistId/tiers/:tierId/Index");
                  return { Component };
                },
              },
              {
                path: "post/:postId",
                async lazy() {
                  const { default: Component } =
                    await import("pages/manage/artists/:artistId/post/:postId/Index");
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
            async lazy() {
              const { default: Component } =
                await import("pages/admin/tasks/Index");
              return { Component };
            },
            children: [
              {
                path: "server-tasks",
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/tasks/server-tasks/Index");
                  return { Component };
                },
              },
              {
                path: "fundraising",
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
            async lazy() {
              const { default: Component } =
                await import("pages/admin/transactions/Index");
              return { Component };
            },
            children: [
              {
                path: "purchases",
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/transactions/purchases/Index");
                  return { Component };
                },
              },
              {
                path: "tips",
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/transactions/tips/Index");
                  return { Component };
                },
              },
              {
                path: "subscriptions",
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/transactions/subscriptions/Index");
                  return { Component };
                },
              },
              {
                path: "fundraiser-pledges",
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
            async lazy() {
              const { default: Component } =
                await import("pages/admin/dashboard/Index");
              return { Component };
            },
          },
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
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/users/Index");
                  return { Component };
                },
              },
              {
                path: "invites",
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/users/invites/Index");
                  return { Component };
                },
              },
              {
                path: ":id",
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/users/:id/Index");
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
                    await import("pages/admin/artists/Index");
                  return { Component };
                },
              },
              {
                path: ":id",
                async lazy() {
                  const { default: Component } =
                    await import("pages/admin/artists/:id/Index");
                  return { Component };
                },
              },
            ],
          },
          {
            path: "track-groups/:id",
            async lazy() {
              const { default: Component } =
                await import("pages/admin/track-groups/:id/Index");
              return { Component };
            },
          },
          {
            path: "track-groups",
            async lazy() {
              const { default: Component } =
                await import("pages/admin/track-groups/Index");
              return { Component };
            },
          },

          {
            path: "tracks",
            async lazy() {
              const { default: Component } =
                await import("pages/admin/tracks/Index");
              return { Component };
            },
          },
          {
            path: "licenses",
            async lazy() {
              const { default: Component } =
                await import("pages/admin/licenses/Index");
              return { Component };
            },
          },
          {
            path: "settings",
            async lazy() {
              const { default: Component } =
                await import("pages/admin/settings/Index");
              return { Component };
            },
          },
          {
            path: "send-emails",
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
            async lazy() {
              const { default: LocationResults } =
                await import("pages/search/locations/:locationSlug/Index");
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
        async lazy() {
          const { default: Component } =
            await import("pages/:artistId/links/Index");
          return { Component };
        },
      },
      {
        path: ":artistId",
        async lazy() {
          const { default: Component } =
            await import("pages/:artistId/Layout");
          return { Component };
        },
        children: [
          {
            path: "",
            async lazy() {
              const { default: Component } =
                await import("pages/:artistId/Index");
              return { Component };
            },
            children: [
              {
                path: "connect",
                async lazy() {
                  const { default: Component } =
                    await import("pages/:artistId/connect/Index");
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
                    await import("pages/:artistId/posts/Index");
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
                        await import("pages/:artistId/merch/:merchId/Index");
                      return {
                        Component: () => <Component />,
                      };
                    },
                  },
                  {
                    path: "",
                    async lazy() {
                      const { default: Component } =
                        await import("pages/:artistId/merch/Index");
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
                    await import("pages/:artistId/checkout-complete/Index");
                  return {
                    Component: () => <Component />,
                  };
                },
              },
              {
                path: "checkout-error",
                async lazy() {
                  const { default: Component } =
                    await import("pages/:artistId/checkout-error/Index");
                  return {
                    Component: () => <Component />,
                  };
                },
              },
              {
                path: "roster",
                async lazy() {
                  const { default: Component } =
                    await import("pages/:artistId/roster/Index");
                  return { Component };
                },
              },
              {
                path: "releases",
                async lazy() {
                  const { default: Component } =
                    await import("pages/:artistId/releases/Index");
                  return { Component };
                },
              },
              {
                path: "support",
                async lazy() {
                  const { default: Component } =
                    await import("pages/:artistId/support/Index");
                  return { Component };
                },
              },
            ],
          },
          {
            path: "unsubscribe",
            async lazy() {
              const { default: Component } =
                await import("pages/:artistId/unsubscribe/Index");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId",
            async lazy() {
              const { default: Component } =
                await import("pages/:artistId/release/:trackGroupId/Index");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/redeem",
            async lazy() {
              const { default: Component } =
                await import("pages/:artistId/release/:trackGroupId/redeem/Index");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/download",
            async lazy() {
              const { default: Component } =
                await import("pages/:artistId/release/:trackGroupId/download/Index");
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/tracks/:trackId/download",
            async lazy() {
              const { default: Component } =
                await import(
                  "pages/:artistId/release/:trackGroupId/tracks/:trackId/download/Index"
                );
              return { Component };
            },
          },
          {
            path: "release/:trackGroupId/tracks/:trackId",
            async lazy() {
              const { default: Component } =
                await import(
                  "pages/:artistId/release/:trackGroupId/tracks/:trackId/Index"
                );
              return { Component };
            },
          },
          {
            path: "posts/:postId",
            async lazy() {
              const { default: Component } =
                await import("pages/:artistId/posts/:postId/Index");
              return { Component };
            },
          },
        ],
      },
    ],
  },
];

export default routes;
