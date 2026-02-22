import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app/App";
import { installDebugHooks, logDebug } from "./lib/debug/logger";
import "./styles/global.css";

installDebugHooks();
logDebug("main_init");

window.addEventListener("vite:preloadError", (event) => {
  // A stale HTML/SW can reference old chunk URLs right after deploy; reload to recover.
  event.preventDefault();
  logDebug("vite_preload_error_reload");
  window.location.reload();
});

registerSW({
  immediate: true
});

logDebug("main_render");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);
