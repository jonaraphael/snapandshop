import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./app/App";
import { installDebugHooks, logDebug } from "./lib/debug/logger";
import "./styles/global.css";

installDebugHooks();
logDebug("main_init");

registerSW({
  immediate: true
});

logDebug("main_render");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);
