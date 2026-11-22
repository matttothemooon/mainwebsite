// Shared look for the link-preview images (Discord, X, iMessage...): the
// home banner's dark starry card with a chrome wordmark, plus a page title.
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const STARS = [
  [90, 120], [210, 470], [340, 90], [470, 540], [610, 70], [720, 520],
  [860, 140], [980, 470], [1110, 230], [150, 300], [1060, 560], [540, 300],
];

const CHROME = "linear-gradient(180deg, #ffffff 0%, #d9d9de 30%, #6e6e76 50%, #f2f2f4 62%, #9a9aa2 82%, #e8e8ec 100%)";

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
        background: "linear-gradient(180deg, #111114 0%, #0a0a0c 100%)",
        color: "#ededf0",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {STARS.map(([x, y], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: i % 3 ? 3 : 4,
            height: i % 3 ? 3 : 4,
            borderRadius: 4,
            background: "#ffffff",
            opacity: i % 2 ? 0.35 : 0.6,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          top: -170,
          right: -110,
          width: 460,
          height: 460,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.16), rgba(255,255,255,0.03) 55%, rgba(255,255,255,0) 70%)",
        }}
      />

      {eyebrow && (
        <div style={{ display: "flex", color: "#8b8b93", fontSize: 28, letterSpacing: 4, textTransform: "uppercase", marginBottom: 18 }}>
          {clip(eyebrow, 40)}
        </div>
      )}
      <div
        style={{
          display: "flex",
          maxWidth: 1000,
          fontSize: titleSize,
          fontWeight: 800,
          letterSpacing: -3,
          lineHeight: 1.05,
          backgroundImage: CHROME,
          backgroundClip: "text",
          color: "transparent",
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

      <div style={{ position: "absolute", left: 90, bottom: 44, display: "flex", alignItems: "center", gap: 18 }}>
        <span
          style={{
            fontSize: 30,
            fontWeight: 800,
            fontStyle: "italic",
            letterSpacing: -1,
            backgroundImage: CHROME,
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          mattothemoon
        </span>
        <span style={{ color: "#55555c", fontSize: 22, letterSpacing: 2 }}>mattothemoon.xyz</span>
      </div>
    </div>,
    OG_SIZE
  );
}
