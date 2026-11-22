// Shared look for the link-preview images (Discord, X, iMessage...): plain
// dark background, big white title, small grey labels.
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const clip = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s || "");

// eyebrow: small caps line; title: the big text; subtitle: one muted line;
// code: optional lines shown in a code box (pastes).
export function ogImage({ eyebrow = "", title = "mattothemoon", subtitle = "", code = null } = {}) {
  const t = clip(title, 70);
  const titleSize = t.length > 40 ? 64 : t.length > 22 ? 80 : 104;

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 90px",
        background: "#0a0a0a",
        color: "#ededf0",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {eyebrow && (
        <div style={{ display: "flex", color: "#8a8a8a", fontSize: 28, fontFamily: "monospace", marginBottom: 18 }}>
          {`> ${clip(eyebrow, 40).toLowerCase()}`}
        </div>
      )}
      <div
        style={{
          display: "flex",
          maxWidth: 1000,
          fontSize: titleSize,
          fontWeight: 700,
          letterSpacing: -4,
          lineHeight: 1.05,
          color: "#f2f2f2",
        }}
      >
        {t}
      </div>
      {subtitle && (
        <div style={{ display: "flex", marginTop: 22, maxWidth: 980, color: "#a1a1aa", fontSize: 32, lineHeight: 1.35 }}>
          {clip(subtitle, 110)}
        </div>
      )}
      {code && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 26,
            padding: "22px 26px",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 18,
            background: "#0d0d10",
            fontFamily: "monospace",
            fontSize: 24,
            lineHeight: 1.5,
            color: "#d4d4d8",
          }}
        >
          {code.map((line, i) => (
            <div key={i} style={{ display: "flex" }}>
              <span style={{ width: 44, color: "#4a4a52" }}>{i + 1}</span>
              <span style={{ whiteSpace: "pre" }}>{clip(line, 62) || " "}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "absolute", left: 90, right: 90, bottom: 44, display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 22 }}>
        <span style={{ color: "#f2f2f2", fontSize: 28, fontWeight: 700 }}>mattothemoon</span>
        <span style={{ color: "#8a8a8a", fontSize: 24 }}>mattothemoon.xyz</span>
      </div>
    </div>,
    OG_SIZE
  );
}
