import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { lazy as reactLazy, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useRouteError,
} from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { getUserSession } from "./lib/api";
import {
  isMemberAppHost,
  isPublicSiteHost,
  memberAppHref,
  publicSiteHref,
} from "./lib/domains";
import { LanguageProvider } from "./lib/i18n";
import "./styles.css";

const chunkReloadKey = "konnektora:chunk-reload";
const chunkLoadErrorPattern =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

const lazy: typeof reactLazy = (loader) =>
  reactLazy(async () => {
    try {
      const module = await loader();
      sessionStorage.removeItem(chunkReloadKey);
      return module;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reloadMarker = `${window.location.pathname}${window.location.search}`;

      if (
        chunkLoadErrorPattern.test(message) &&
        sessionStorage.getItem(chunkReloadKey) !== reloadMarker
      ) {
        sessionStorage.setItem(chunkReloadKey, reloadMarker);
        window.location.reload();
        return await new Promise<never>(() => undefined);
      }

      throw error;
    }
  });

function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : "Sayfa yüklenirken beklenmeyen bir sorun oluştu.";

  return (
    <main className="route-error-page" role="alert">
      <div className="loading-mark" aria-hidden="true" />
      <span className="eyebrow">Bağlantı yenilenemedi</span>
      <h1>Sayfayı yeniden yükleyelim.</h1>
      <p>{message}</p>
      <div className="row-actions">
        <button className="primary-action" onClick={() => window.location.reload()}>
          Tekrar dene
        </button>
        <a className="secondary-action" href={publicSiteHref()}>
          Ana sayfaya dön
        </a>
      </div>
    </main>
  );
}

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

function DomainAwareHomePage() {
  if (isMemberAppHost()) {
    return <Navigate replace to={getUserSession() ? "/feed" : "/login"} />;
  }

  return <HomePage />;
}

function MembershipDomainGuard() {
  const location = useLocation();
  const redirectHref = isPublicSiteHost()
    ? memberAppHref(`${location.pathname}${location.search}${location.hash}`)
    : null;

  useEffect(() => {
    if (redirectHref) window.location.replace(redirectHref);
  }, [redirectHref]);

  if (redirectHref) {
    return (
      <div className="page route-loading app-loading-screen" role="status">
        <div className="loading-mark" aria-hidden="true" />
        <strong>Üyelik alanına yönlendiriliyorsunuz…</strong>
        <span>Güvenli uygulama açılıyor</span>
      </div>
    );
  }

  return <Outlet />;
}

const router = createBrowserRouter([
  {
    path: "/mobile",
    element: <MobileAppPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DomainAwareHomePage /> },
      { path: "business", element: <BusinessLandingPage /> },
      { path: "curators", element: <CuratorsPage /> },
      { path: "events", element: <EventsPage /> },
      { path: "events/:slug", element: <EventDetailPage /> },
      {
        path: "events/:slug/users",
        element: <RelatedUsersPage kind="event" />,
      },
      { path: "places", element: <PlacesPage /> },
      { path: "places/:slug", element: <PlaceDetailPage /> },
      {
        path: "places/:slug/users",
        element: <RelatedUsersPage kind="place" />,
      },
      { path: "search", element: <SearchPage /> },
      { path: "users/:username", element: <PublicProfilePage /> },
      { path: "users/id/:userId", element: <PublicProfilePage /> },
      { path: "tags", element: <TagsPage /> },
      { path: "tags/:slug", element: <TagsPage /> },
      { path: "tags/:slug/users", element: <RelatedUsersPage kind="tag" /> },
      { path: "contact", element: <ContactPage /> },
      { path: "help", element: <HelpCenterPage /> },
      { path: "help/faqs", element: <HelpCenterPage /> },
      { path: "help/faqs/:categorySlug", element: <HelpCenterPage /> },
      { path: "help/faq/:faqId", element: <HelpCenterPage /> },
      { path: "help/search", element: <HelpCenterPage /> },
      {
        element: <MembershipDomainGuard />,
        children: [
          { path: "feed", element: <FeedPage /> },
          { path: "community", element: <CommunityPage /> },
          { path: "finance", element: <FinancePage /> },
          { path: "finance/kyc", element: <CorporateKycPage /> },
          { path: "store", element: <StorePage /> },
          { path: "messages", element: <MessagesPage /> },
          { path: "identity", element: <IdentityPage /> },
          { path: "onboarding", element: <OnboardingPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "tickets", element: <TicketsPage /> },
          { path: "login", element: <AccountPage initialMode="login" /> },
          { path: "events/create", element: <AccountPage eventCreator /> },
          { path: "events/:slug/invites", element: <EventInviteManagementPage /> },
          { path: "places/:slug/invites", element: <PlaceInviteManagementPage /> },
          { path: "account", element: <Navigate replace to="/settings" /> },
          { path: "settings", element: <SettingsCenterPage /> },
          { path: "settings/profile-pictures", element: <SettingsSectionPage section="profile-pictures" /> },
          { path: "settings/profile", element: <SettingsSectionPage section="profile" /> },
          { path: "settings/account", element: <SettingsSectionPage section="account" /> },
          { path: "settings/notifications", element: <SettingsSectionPage section="notifications" /> },
          { path: "settings/privacy", element: <SettingsSectionPage section="privacy" /> },
          { path: "settings/business", element: <SettingsSectionPage section="business" /> },
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
        ],
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
