import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LanguageProvider } from "./lib/i18n";
import "./styles.css";

const AccountPage = lazy(() => import("./pages/AccountPage").then((module) => ({ default: module.AccountPage })));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })));
const AcceptInvitePage = lazy(() => import("./pages/AuthTokenPage").then((module) => ({ default: module.AcceptInvitePage })));
const ResetPasswordPage = lazy(() => import("./pages/AuthTokenPage").then((module) => ({ default: module.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import("./pages/AuthTokenPage").then((module) => ({ default: module.VerifyEmailPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((module) => ({ default: module.ContactPage })));
const HelpCenterPage = lazy(() => import("./pages/HelpCenterPage").then((module) => ({ default: module.HelpCenterPage })));
const ContactsPage = lazy(() => import("./pages/ContactsPage").then((module) => ({ default: module.ContactsPage })));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage").then((module) => ({ default: module.EventDetailPage })));
const EventsPage = lazy(() => import("./pages/EventsPage").then((module) => ({ default: module.EventsPage })));
const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const FeedPage = lazy(() => import("./pages/FeedPage").then((module) => ({ default: module.FeedPage })));
const FinancePage = lazy(() => import("./pages/FinancePage").then((module) => ({ default: module.FinancePage })));
const AdminKycPage = lazy(() => import("./pages/AdminKycPage").then((module) => ({ default: module.AdminKycPage })));
const AdminNotificationOperationsPage = lazy(() => import("./pages/AdminNotificationOperationsPage").then((module) => ({ default: module.AdminNotificationOperationsPage })));
const CorporateKycPage = lazy(() => import("./pages/CorporateKycPage").then((module) => ({ default: module.CorporateKycPage })));
const MobileAppPage = lazy(() => import("./pages/MobileAppPage").then((module) => ({ default: module.MobileAppPage })));
const MessagesPage = lazy(() => import("./pages/MessagesPage").then((module) => ({ default: module.MessagesPage })));
const IdentityPage = lazy(() => import("./pages/IdentityPage").then((module) => ({ default: module.IdentityPage })));
const SearchPage = lazy(() => import("./pages/SearchPage").then((module) => ({ default: module.SearchPage })));
const PublicProfilePage = lazy(() => import("./pages/PublicProfilePage").then((module) => ({ default: module.PublicProfilePage })));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage").then((module) => ({ default: module.OnboardingPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const TicketsPage = lazy(() => import("./pages/TicketsPage").then((module) => ({ default: module.TicketsPage })));
const TagsPage = lazy(() => import("./pages/TagsPage").then((module) => ({ default: module.TagsPage })));
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
      { path: "feed", element: <FeedPage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "finance/kyc", element: <CorporateKycPage /> },
      { path: "events", element: <EventsPage /> },
      { path: "events/:slug", element: <EventDetailPage /> },
      { path: "places", element: <PlacesPage /> },
      { path: "places/:slug", element: <PlaceDetailPage /> },
      { path: "messages", element: <MessagesPage /> },
      { path: "identity", element: <IdentityPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "users/:username", element: <PublicProfilePage /> },
      { path: "onboarding", element: <OnboardingPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "tickets", element: <TicketsPage /> },
      { path: "tags", element: <TagsPage /> },
      { path: "tags/:slug", element: <TagsPage /> },
      { path: "account", element: <AccountPage /> },
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
      { path: "admin/notifications", element: <AdminNotificationOperationsPage /> },
      { path: ":type", element: <PolicyPage /> }
    ]
  }
]);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div className="page route-loading" role="status">Sayfa yükleniyor…</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </QueryClientProvider>
    </LanguageProvider>
  </React.StrictMode>
);
