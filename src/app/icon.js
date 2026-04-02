import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
            flexDirection: "column",
            width: "82%",
            height: "82%",
            borderRadius: "96px",
            background: "rgba(255,255,255,0.12)",
            border: "3px solid rgba(255,255,255,0.2)",
            padding: "56px",
            justifyContent: "space-between",
            boxShadow: "0 20px 80px rgba(15,23,42,0.24)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 50,
              fontWeight: 700,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              opacity: 0.78,
            }}
          >
            Church Care
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 186,
                  lineHeight: 0.9,
                  fontWeight: 800,
                  letterSpacing: "-0.06em",
                }}
              >
                CC
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 44,
                  fontWeight: 600,
                  opacity: 0.9,
                }}
              >
                Care OS
              </div>
            </div>
            <div
              style={{
                display: "flex",
                width: 96,
                height: 96,
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 42,
                fontWeight: 700,
              }}
            >
              +
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
