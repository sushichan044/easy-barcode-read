import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../styles.css";
import { App } from "./App";

const container = document.querySelector("#root");
if (container === null) {
  throw new Error("ルート要素が見つかりません。");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
