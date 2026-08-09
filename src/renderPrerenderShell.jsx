import React from "react";
import { renderToString } from "react-dom/server";
import PrerenderShell from "./PrerenderShell";

export function renderPrerenderShell() {
  return renderToString(<PrerenderShell />);
}
