import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import "./styles.css";

const AccountPage = lazy(() => import("./pages/AccountPage").then((module) => ({ default: module.AccountPage })));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })));
const AcceptInvitePage = lazy(() => import("./pages/AuthTokenPage").then((module) => ({ default: module.AcceptInvitePage })));
const ResetPasswordPage = lazy(() => import("./pages/AuthTokenPage").then((module) => ({ default: module.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import("./pages/AuthTokenPage").then((module) => ({ default: module.VerifyEmailPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((module) => ({ default: module.ContactPage })));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage").then((module) => ({ default: module.EventDetailPage })));
const EventsPage = lazy(() => import("./pages/EventsPage").then((module) => ({ default: module.EventsPage })));
const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const MobileAppPage = lazy(() => import("./pages/MobileAppPage").then((module) => ({ default: module.MobileAppPage })));
const MessagesPage = lazy(() => import("./pages/MessagesPage").then((module) => ({ default: module.MessagesPage })));
const IdentityPage = lazy(() => import("./pages/IdentityPage").then((module) => ({ default: module.IdentityPage })));
const SearchPage = lazy(() => import("./pages/SearchPage").then((module) => ({ default: module.SearchPage })));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage").then((module) => ({ default: module.PublicProfilePage })));
const PlacesPage = lazy(() => import("./pages/PlacesPage").then((module) => ({ default: module.PlacesPage })));
const PlaceDetailPage = lazy(() => import("./pages/PlaceDetailPage").then((module) => ({ default: module.PlaceDetailPage })));
const PolicyPage = lazy(() => import("./pages/PolicyPage").then((module) => ({ default: module.PolicyPage })));

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/mobile", element: <MobileAppPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "events", element: <EventsPage /> },
      { path: "events/:slug", element: <EventDetailPage /> },
      { path: "places", element: <PlacesPage /> },
      { path: "places/:slug", element: <PlaceDetailPage /> },
      { path: "messages", element: <MessagesPage /> },
      { path: "identity", element: <IdentityPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "users/:username", element: <PublicProfilePage /> },
      { path: "account", element: <AccountPage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "accept-invite", element: <AcceptInvitePage /> },
      { path: "admin", element: <AdminDashboardPage /> },
      { path: ":type", element: <PolicyPage /> }
    ]
  }
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div className="page route-loading" role="status">Sayfa yükleniyor…</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  </React.StrictMode>
);
