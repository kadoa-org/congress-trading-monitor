import React from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

export function renderTickerPage(initialPage) {
  return renderToString(<App initialPage={initialPage} />);
}
