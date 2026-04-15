import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(160deg, rgb(2, 2, 102) 0%, rgb(2, 2, 102) 40%, rgb(8, 8, 45) 100%)",
          color: "white",
          fontFamily: "Inter, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "76%",
            height: "76%",
            borderRadius: "32px",
            background: "rgba(255,255,255,0.08)",
            border: "2px solid rgba(212,175,55,0.35)",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 72,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "-0.06em",
              color: "#D4AF37",
            }}
          >
            FL
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: 0.85,
              color: "white",
            }}
          >
            Assembly
          </div>
        </div>
      </div>
    ),
    size
  );
}
