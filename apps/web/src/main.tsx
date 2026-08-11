import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LanguageProvider } from "./lib/i18n";
import "./styles.css";

const AccountPage = lazy(() =>
  import("./pages/AccountPage").then((module) => ({
    default: module.AccountPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import("./pages/AdminDashboardPage").then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const AcceptInvitePage = lazy(() =>
  import("./pages/AuthTokenPage").then((module) => ({
    default: module.AcceptInvitePage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/AuthTokenPage").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("./pages/AuthTokenPage").then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
const ContactPage = lazy(() =>
  import("./pages/ContactPage").then((module) => ({
    default: module.ContactPage,
  })),
);
const HelpCenterPage = lazy(() =>
  import("./pages/HelpCenterPage").then((module) => ({
    default: module.HelpCenterPage,
  })),
);
const ContactsPage = lazy(() =>
  import("./pages/ContactsPage").then((module) => ({
    default: module.ContactsPage,
  })),
);
const EventDetailPage = lazy(() =>
  import("./pages/EventDetailPage").then((module) => ({
    default: module.EventDetailPage,
  })),
);
const EventsPage = lazy(() =>
  import("./pages/EventsPage").then((module) => ({
    default: module.EventsPage,
  })),
);
const HomePage = lazy(() =>
  import("./pages/HomePage").then((module) => ({ default: module.HomePage })),
);
const FeedPage = lazy(() =>
  import("./pages/FeedPage").then((module) => ({ default: module.FeedPage })),
);
const CommunityPage = lazy(() =>
  import("./pages/CommunityPage").then((module) => ({
    default: module.CommunityPage,
  })),
);
const FinancePage = lazy(() =>
  import("./pages/FinancePage").then((module) => ({
    default: module.FinancePage,
  })),
);
const BusinessLandingPage = lazy(() =>
  import("./pages/BusinessLandingPage").then((module) => ({
    default: module.BusinessLandingPage,
  })),
);
const StorePage = lazy(() =>
  import("./pages/StorePage").then((module) => ({ default: module.StorePage })),
);
const CuratorsPage = lazy(() =>
  import("./pages/CuratorsPage").then((module) => ({
    default: module.CuratorsPage,
  })),
);
const AdminKycPage = lazy(() =>
  import("./pages/AdminKycPage").then((module) => ({
    default: module.AdminKycPage,
  })),
);
const AdminNotificationOperationsPage = lazy(() =>
  import("./pages/AdminNotificationOperationsPage").then((module) => ({
    default: module.AdminNotificationOperationsPage,
  })),
);
const CorporateKycPage = lazy(() =>
  import("./pages/CorporateKycPage").then((module) => ({
    default: module.CorporateKycPage,
  })),
);
const MobileAppPage = lazy(() =>
  import("./pages/MobileAppPage").then((module) => ({
    default: module.MobileAppPage,
  })),
);
const MessagesPage = lazy(() =>
  import("./pages/MessagesPage").then((module) => ({
    default: module.MessagesPage,
  })),
);
const IdentityPage = lazy(() =>
  import("./pages/IdentityPage").then((module) => ({
    default: module.IdentityPage,
  })),
);
const SearchPage = lazy(() =>
  import("./pages/SearchPage").then((module) => ({
    default: module.SearchPage,
  })),
);
const PublicProfilePage = lazy(() =>
  import("./pages/PublicProfilePage").then((module) => ({
    default: module.PublicProfilePage,
  })),
);
const OnboardingPage = lazy(() =>
  import("./pages/OnboardingPage").then((module) => ({
    default: module.OnboardingPage,
  })),
);
const NotificationsPage = lazy(() =>
  import("./pages/NotificationsPage").then((module) => ({
    default: module.NotificationsPage,
  })),
);
const TicketsPage = lazy(() =>
  import("./pages/TicketsPage").then((module) => ({
    default: module.TicketsPage,
  })),
);
const TagsPage = lazy(() =>
  import("./pages/TagsPage").then((module) => ({ default: module.TagsPage })),
);
const PlacesPage = lazy(() =>
  import("./pages/PlacesPage").then((module) => ({
    default: module.PlacesPage,
  })),
);
const PlaceDetailPage = lazy(() =>
  import("./pages/PlaceDetailPage").then((module) => ({
    default: module.PlaceDetailPage,
  })),
);
const EventInviteManagementPage = lazy(() =>
  import("./pages/InviteManagementPage").then((module) => ({
    default: module.EventInviteManagementPage,
  })),
);
const PlaceInviteManagementPage = lazy(() =>
  import("./pages/InviteManagementPage").then((module) => ({
    default: module.PlaceInviteManagementPage,
  })),
);
const RelatedUsersPage = lazy(() =>
  import("./pages/RelatedUsersPage").then((module) => ({
    default: module.RelatedUsersPage,
  })),
);
const PolicyPage = lazy(() =>
  import("./pages/PolicyPage").then((module) => ({
    default: module.PolicyPage,
  })),
);
const SettingsCenterPage = lazy(() =>
  import("./pages/SettingsCenterPage").then((module) => ({ default: module.SettingsCenterPage })),
);
const SettingsSectionPage = lazy(() =>
  import("./pages/SettingsCenterPage").then((module) => ({ default: module.SettingsSectionPage })),
);

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/mobile", element: <MobileAppPage /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "feed", element: <FeedPage /> },
      { path: "community", element: <CommunityPage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "business", element: <BusinessLandingPage /> },
      { path: "store", element: <StorePage /> },
      { path: "curators", element: <CuratorsPage /> },
      { path: "finance/kyc", element: <CorporateKycPage /> },
      { path: "events", element: <EventsPage /> },
      { path: "events/:slug", element: <EventDetailPage /> },
      { path: "events/:slug/invites", element: <EventInviteManagementPage /> },
      {
        path: "events/:slug/users",
        element: <RelatedUsersPage kind="event" />,
      },
      { path: "places", element: <PlacesPage /> },
      { path: "places/:slug", element: <PlaceDetailPage /> },
      { path: "places/:slug/invites", element: <PlaceInviteManagementPage /> },
      {
        path: "places/:slug/users",
        element: <RelatedUsersPage kind="place" />,
      },
      { path: "messages", element: <MessagesPage /> },
      { path: "identity", element: <IdentityPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "users/:username", element: <PublicProfilePage /> },
      { path: "users/id/:userId", element: <PublicProfilePage /> },
      { path: "onboarding", element: <OnboardingPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "tickets", element: <TicketsPage /> },
      { path: "tags", element: <TagsPage /> },
      { path: "tags/:slug", element: <TagsPage /> },
      { path: "tags/:slug/users", element: <RelatedUsersPage kind="tag" /> },
      { path: "account", element: <AccountPage /> },
      { path: "settings", element: <SettingsCenterPage /> },
      { path: "settings/profile-pictures", element: <SettingsSectionPage section="profile-pictures" /> },
      { path: "settings/profile", element: <SettingsSectionPage section="profile" /> },
      { path: "settings/account", element: <SettingsSectionPage section="account" /> },
      { path: "settings/notifications", element: <SettingsSectionPage section="notifications" /> },
      { path: "settings/privacy", element: <SettingsSectionPage section="privacy" /> },
      { path: "settings/business", element: <SettingsSectionPage section="business" /> },
      { path: "contact", element: <ContactPage /> },
      { path: "help", element: <HelpCenterPage /> },
      { path: "help/faqs", element: <HelpCenterPage /> },
      { path: "help/faqs/:categorySlug", element: <HelpCenterPage /> },
      { path: "help/faq/:faqId", element: <HelpCenterPage /> },
      { path: "help/search", element: <HelpCenterPage /> },
      { path: "contacts", element: <ContactsPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "accept-invite", element: <AcceptInvitePage /> },
      { path: "admin", element: <AdminDashboardPage /> },
      { path: "admin/kyc", element: <AdminKycPage /> },
      {
        path: "admin/notifications",
        element: <AdminNotificationOperationsPage />,
      },
      { path: ":type", element: <PolicyPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense
          fallback={
            <div className="page route-loading app-loading-screen" role="status"><div className="loading-mark" aria-hidden="true"/><strong>Sayfa yükleniyor…</strong><span>İçerik hazırlanıyor</span></div>
          }
        >
          <RouterProvider router={router} />
        </Suspense>
      </QueryClientProvider>
    </LanguageProvider>
  </React.StrictMode>,
);
