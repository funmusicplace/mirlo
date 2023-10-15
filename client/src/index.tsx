import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App";
import reportWebVitals from "./reportWebVitals";
import ErrorPage from "./components/ErrorPage";
import "./i18n";

// import Signup from "./components/Signup";
import Login from "./components/Login";
import { GlobalStateProvider } from "./state/GlobalState";
import Profile from "./components/Profile";
import Manage from "./components/ManageArtist/Manage";
import { SnackBarContextProvider } from "state/SnackbarContext";
import { ThemeProvider } from "@emotion/react";
import { theme } from "utils/theme";
import Admin from "components/Admin/Admin";
import AdminUsers from "components/Admin/Users";
import AdminTrackGroups from "components/Admin/Trackgroups";
import AdminTracks from "components/Admin/Tracks";
import ManageArtist from "components/ManageArtist/ManageArtist";
import Home from "components/Home";
import Artist from "components/Artist/Artist";
import TrackGroupWidget from "components/Widget/TrackGroupWidget";
import TrackWidget from "components/Widget/TrackWidget";
import Collection from "components/Collection";
import Post from "components/Post";
import PasswordReset from "components/PasswordReset";
import TrackGroup from "components/TrackGroup/TrackGroup";
import About from "components/About";
import { AuthWrapper } from "components/AuthWrapper";
import Signup from "components/Signup";
import { ArtistProvider } from "state/ArtistContext";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { path: "", element: <Home /> },
      { path: "about", element: <About /> },

      { path: "widget/track/:id", element: <TrackWidget /> },
      { path: "widget/trackgroup/:id", element: <TrackGroupWidget /> },
      { path: "post/:postId", element: <Post /> },
      {
        path: "signup",
        element: <Signup />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "profile",
        element: (
          <AuthWrapper>
            <Profile />
          </AuthWrapper>
        ),
      },
      {
        path: "password-reset",
        element: <PasswordReset />,
      },
      {
        path: "profile/collection",
        element: (
          <AuthWrapper>
            <Collection />
          </AuthWrapper>
        ),
      },
      {
        path: "manage",
        element: (
          <AuthWrapper>
            <Manage />
          </AuthWrapper>
        ),
      },
      {
        path: "manage/artists/:artistId",
        element: (
          <AuthWrapper>
            <ArtistProvider managedArtist>
              <ManageArtist />
            </ArtistProvider>
          </AuthWrapper>
        ),
      },
      {
        path: "admin",
        element: (
          <AuthWrapper>
            <Admin />
          </AuthWrapper>
        ),
        children: [
          {
            path: "users",
            element: (
              <AuthWrapper>
                <AdminUsers />
              </AuthWrapper>
            ),
          },
          {
            path: "trackGroups",
            element: (
              <AuthWrapper>
                <AdminTrackGroups />
              </AuthWrapper>
            ),
          },
          {
            path: "tracks",
            element: (
              <AuthWrapper>
                <AdminTracks />
              </AuthWrapper>
            ),
          },
        ],
      },
      {
        path: ":artistId",
        children: [
          {
            path: "",
            element: (
              <ArtistProvider>
                <Artist />
              </ArtistProvider>
            ),
          },
          {
            path: "tg/:trackGroupId",
            element: (
              <ArtistProvider>
                <TrackGroup />
              </ArtistProvider>
            ),
          },
        ],
      },
    ],
  },
]);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <GlobalStateProvider>
        <SnackBarContextProvider>
          <RouterProvider router={router} />
        </SnackBarContextProvider>
      </GlobalStateProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
