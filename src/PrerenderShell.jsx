import React from "react";

const block = (width, height, marginBottom = 0) => ({
  width,
  height,
  marginBottom,
  background: "#e5e5e5",
  borderRadius: 2,
});

export default function PrerenderShell() {
  return (
    <div aria-busy="true" aria-label="Loading trading data" style={{ minHeight: "100vh", background: "#f7f7f5" }}>
      <div style={{ height: 58, background: "#0b0c0c" }} />
      <div style={{ height: 44, background: "#fff", borderBottom: "1px solid #b1b4b6" }} />
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "64px 24px 80px" }}>
        <div style={block(160, 16, 16)} />
        <div style={block("72%", 40, 12)} />
        <div style={block("64%", 16, 32)} />
        <div style={{ height: 104, background: "#fff", border: "1px solid #b1b4b6", marginBottom: 32 }} />
        <div style={block(256, 24, 16)} />
        <div style={{ height: 520, background: "#fff", border: "1px solid #b1b4b6" }} />
      </div>
    </div>
  );
}
