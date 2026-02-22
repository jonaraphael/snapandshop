import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ROUTES } from "./routes";
import { Landing } from "../screens/Landing";
import { Capture } from "../screens/Capture";
import { Processing } from "../screens/Processing";
import { Review } from "../screens/Review";
import { List } from "../screens/List";
import { useAppStore } from "./store";
import { useEffect } from "react";
import { logDebug } from "../lib/debug/logger";

const RouteLogger = (): null => {
  const location = useLocation();

  useEffect(() => {
    logDebug("route_change", {
      path: location.pathname,
      search: location.search
    });
  }, [location.pathname, location.search]);

  return null;
};

export const App = (): JSX.Element => {
  const fontScale = useAppStore((state) => state.prefs.fontScale);

  useEffect(() => {
    document.documentElement.style.setProperty("--fontScale", String(fontScale));
    logDebug("font_scale_applied", { fontScale });
  }, [fontScale]);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RouteLogger />
      <Routes>
        <Route path={ROUTES.landing} element={<Landing />} />
        <Route path={ROUTES.capture} element={<Capture />} />
        <Route path={ROUTES.processing} element={<Processing />} />
        <Route path={ROUTES.review} element={<Review />} />
        <Route path={ROUTES.list} element={<List />} />
        <Route path="*" element={<Navigate to={ROUTES.landing} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
