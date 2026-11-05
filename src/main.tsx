import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./router";
import { useStore } from "./store/useStore";
// Only @font-face rules: the browser downloads just the font in use.
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/lora";
import "@fontsource-variable/nunito";
import "@fontsource-variable/plus-jakarta-sans";
import "./index.css";

void useStore.getState().load();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
