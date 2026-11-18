import { ImageResponse } from "next/og";

export const alt = "mattothemoon — community mod and streamer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Matches the homepage banner: near-black card, chrome wordmark, faint moon.
const STARS = [
  [90, 120], [210, 470], [340, 90], [470, 540], [610, 70], [720, 520],
  [860, 140], [980, 470], [1110, 230], [150, 300], [1060, 560], [540, 300],
];

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
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
          background:
            "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.16), rgba(255,255,255,0.03) 55%, rgba(255,255,255,0) 70%)",
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: 132,
          fontWeight: 800,
          fontStyle: "italic",
          letterSpacing: -6,
          backgroundImage:
            "linear-gradient(180deg, #ffffff 0%, #d9d9de 30%, #6e6e76 50%, #f2f2f4 62%, #9a9aa2 82%, #e8e8ec 100%)",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        mattothemoon
      </div>
      <div style={{ display: "flex", marginTop: 18, color: "#8b8b93", fontSize: 34 }}>
        Community Mod · Streamer · Community Manager
      </div>
      <div style={{ position: "absolute", bottom: 44, display: "flex", color: "#55555c", fontSize: 24, letterSpacing: 2 }}>
        mattothemoon.xyz
      </div>
    </div>,
    size
  );
}
