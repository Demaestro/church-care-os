export default function manifest() {
  return {
    id: "/",
    name: "Church Care OS",
    short_name: "Church Care",
    description:
      "A secure church ecosystem for care, discipleship, ministries, branch operations, Sunday readiness, and stewardship.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f6fb",
    theme_color: "#2563eb",
    categories: ["productivity", "utilities", "lifestyle"],
    icons: [
      {
        src: "/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/app-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Ecosystem Command",
        short_name: "Command",
        description: "Open the connected church command surface.",
        url: "/ecosystem",
      },
      {
        name: "Operations Command",
        short_name: "Operations",
        description: "Review inventory, diesel, assets, maintenance, and purchases.",
        url: "/operations",
      },
      {
        name: "Request care",
        short_name: "Request care",
        description: "Open the private care request form.",
        url: "/requests/new",
      },
      {
        name: "Track request",
        short_name: "Track",
        description: "Check the status of an existing care request.",
        url: "/requests/status",
      },
      {
        name: "Sign in",
        short_name: "Sign in",
        description: "Open the staff and volunteer sign-in screen.",
        url: "/login",
      },
    ],
  };
}
