import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "./routes";
import { Landing } from "../screens/Landing";
import { Capture } from "../screens/Capture";
import { Processing } from "../screens/Processing";
import { Review } from "../screens/Review";
import { List } from "../screens/List";
import { useAppStore } from "./store";
import { useEffect, useState } from "react";
import { logDebug } from "../lib/debug/logger";
import {
  decodeSharedListState,
  encodeSharedListState,
  SHARE_QUERY_PARAM
} from "../lib/share/urlListState";

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

const UrlShareSync = (): null => {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAppStore((state) => state.session);
  const loadSharedList = useAppStore((state) => state.loadSharedList);
  const [hydrationComplete, setHydrationComplete] = useState(false);

  useEffect(() => {
    if (hydrationComplete) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const token = params.get(SHARE_QUERY_PARAM);
    if (!token) {
      setHydrationComplete(true);
      return;
    }

    const decoded = decodeSharedListState(token);
    if (!decoded) {
      logDebug("share_url_decode_failed");
      setHydrationComplete(true);
      return;
    }

    loadSharedList(decoded);
    logDebug("share_url_loaded", {
      itemCount: decoded.items.length,
      hasTitle: Boolean(decoded.listTitle)
    });
    setHydrationComplete(true);

    if (location.pathname !== ROUTES.list) {
      navigate(
        {
          pathname: ROUTES.list,
          search: location.search
        },
        { replace: true }
      );
    }
  }, [hydrationComplete, location.pathname, location.search, loadSharedList, navigate]);

  useEffect(() => {
    if (!hydrationComplete) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const currentToken = params.get(SHARE_QUERY_PARAM);
    const nextToken = encodeSharedListState(session);

    if (!nextToken && !currentToken) {
      return;
    }

    if (nextToken && currentToken === nextToken) {
      return;
    }

    if (nextToken) {
      params.set(SHARE_QUERY_PARAM, nextToken);
    } else {
      params.delete(SHARE_QUERY_PARAM);
    }

    const nextSearch = params.toString();
    const normalizedCurrentSearch = location.search.startsWith("?")
      ? location.search.slice(1)
      : location.search;
    if (nextSearch === normalizedCurrentSearch) {
      return;
    }

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
        hash: location.hash
      },
      { replace: true }
    );
  }, [hydrationComplete, location.hash, location.pathname, location.search, navigate, session]);

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
      <UrlShareSync />
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
