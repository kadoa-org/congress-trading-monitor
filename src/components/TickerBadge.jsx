import React from "react";
import { TickerTag } from "../kit";

// Migrated to the kit TickerTag (square tint chip, mono glyphs, non-semantic
// hues). This file remains as a back-compat alias for existing imports.
export function TickerBadge({ ticker, size = "md" }) {
  return <TickerTag ticker={ticker} size={size} />;
}

export const TickerLabel = TickerBadge;
