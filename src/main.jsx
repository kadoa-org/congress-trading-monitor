import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import { parseRoute } from "./router";
import "./govuk.scss";
import "./index.css";

const root = document.getElementById("root");
const initialData = document.getElementById("page-data");
const embeddedPage = initialData ? JSON.parse(initialData.textContent) : null;
const route = parseRoute();
const matchesRoute = embeddedPage?.route.name === route.name && embeddedPage?.route.id === route.id && embeddedPage?.route.symbol === route.symbol;
const initialPage = matchesRoute ? embeddedPage : null;
const app = <App initialPage={initialPage} />;

if (initialPage && root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
