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
            "linear-gradient(160deg, rgb(2, 2, 102) 0%, rgb(2, 2, 102) 34%, rgb(10, 10, 40) 100%)",
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
          {/* Gold flame accent */}
          <div
            style={{
              display: "flex",
              width: 64,
              height: 64,
              borderRadius: 999,
              background: "linear-gradient(135deg, #D4AF37 0%, #c9a227 100%)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            🔥
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 160,
                lineHeight: 0.88,
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
                fontSize: 40,
                fontWeight: 600,
                opacity: 0.85,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Assembly
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
