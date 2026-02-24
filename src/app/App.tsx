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
  SHARE_QUERY_PARAM
} from "../lib/share/urlListState";
import { SHARE_ID_QUERY_PARAM, fetchSharedTokenById } from "../lib/share/shareApi";

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
  const loadSharedList = useAppStore((state) => state.loadSharedList);
  const [hydrationComplete, setHydrationComplete] = useState(false);

  useEffect(() => {
    if (hydrationComplete) {
      return;
    }

    let canceled = false;
    const controller = new AbortController();

    const hydrateFromUrl = async (): Promise<void> => {
      const params = new URLSearchParams(location.search);
      const shareId = params.get(SHARE_ID_QUERY_PARAM);
      const legacyToken = params.get(SHARE_QUERY_PARAM);
      let tokenToDecode: string | null = null;

      if (shareId) {
        try {
          tokenToDecode = await fetchSharedTokenById(shareId, controller.signal);
        } catch (error) {
          logDebug("share_id_fetch_failed", {
            shareId,
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }

      if (!tokenToDecode && legacyToken) {
        tokenToDecode = legacyToken;
      }

      const decoded = tokenToDecode ? decodeSharedListState(tokenToDecode) : null;
      if (decoded) {
        loadSharedList(decoded);
        logDebug("share_url_loaded", {
          itemCount: decoded.items.length,
          hasTitle: Boolean(decoded.listTitle),
          viaShareId: Boolean(shareId)
        });
      } else if (shareId || legacyToken) {
        logDebug("share_url_decode_failed", {
          hasShareId: Boolean(shareId),
          hasLegacyToken: Boolean(legacyToken)
        });
      }

      if (canceled) {
        return;
      }

      setHydrationComplete(true);

      if (decoded && location.pathname !== ROUTES.list) {
        navigate(
          {
            pathname: ROUTES.list,
            search: location.search
          },
          { replace: true }
        );
      }
    };

    void hydrateFromUrl();

    return () => {
      canceled = true;
      controller.abort();
    };
  }, [hydrationComplete, location.pathname, location.search, loadSharedList, navigate]);

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
