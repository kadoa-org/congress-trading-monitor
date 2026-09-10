import { useEffect } from "react";

function removePrerender() {
  for (const element of document.querySelectorAll(".seo-shell")) element.remove();
}

export function discardPrerenderOnNavigation() {
  const initialPath = window.location.pathname;
  for (const element of document.querySelectorAll(".seo-shell")) {
    if (element.dataset.path?.replace(/\/$/, "") !== initialPath.replace(/\/$/, "")) element.remove();
  }
  const onNavigation = () => {
    if (window.location.pathname !== initialPath) {
      removePrerender();
      window.removeEventListener("popstate", onNavigation);
    }
  };
  window.addEventListener("popstate", onNavigation);
}

// A successful route render replaces the initial answer. Loading failures retain it.
export function usePrerenderReplacement(ready) {
  useEffect(() => {
    if (ready) removePrerender();
  }, [ready]);
}
