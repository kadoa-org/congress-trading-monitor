import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

export function renderPage(initialPage) {
  return renderToString(<App initialPage={initialPage} />);
}
