import { ImageResponse } from "next/og";

export const alt = "mattothemoon — community mod and streamer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "72px 84px",
        color: "#e8ecf5",
        background:
          "radial-gradient(circle at 82% 24%, #283354 0, #111729 32%, #080a13 72%)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            color: "#9db4ff",
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          mattothemoon.xyz
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3 }}>
          mattothemoon
        </div>
        <div style={{ color: "#b5bfd5", fontSize: 32 }}>
          Community mod &amp; streamer
        </div>
      </div>
      <div
        style={{
          width: 250,
          height: 250,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 34% 30%, #fff3bd 0 2%, #f1e6b8 3% 56%, #a89c70 57% 59%, #161b2c 60%)",
          boxShadow: "0 0 70px #f1e6b844",
        }}
      />
    </div>,
    size
  );
}
