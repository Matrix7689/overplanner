import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { CalendarPage } from "./pages/CalendarPage";
import { CategoryPage } from "./pages/CategoryPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DevPage } from "./pages/DevPage";
import { InboxPage } from "./pages/InboxPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ResultsPage } from "./pages/ResultsPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "category/:slug", element: <CategoryPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "results", element: <ResultsPage /> },
      { path: "inbox", element: <InboxPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "dev", element: <DevPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
