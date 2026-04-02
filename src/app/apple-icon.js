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
            "linear-gradient(160deg, rgb(37, 99, 235) 0%, rgb(37, 99, 235) 34%, rgb(15, 23, 42) 100%)",
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
            background: "rgba(255,255,255,0.12)",
            border: "2px solid rgba(255,255,255,0.18)",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 70,
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: "-0.08em",
            }}
          >
            CC
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: 0.82,
            }}
          >
            Care OS
          </div>
        </div>
      </div>
    ),
    size
  );
}
