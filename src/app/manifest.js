export default function manifest() {
  return {
    id: "/",
    name: "FirstLove Assembly",
    short_name: "Church OS",
    description:
      "The complete ministry platform for FirstLove Assembly — members, attendance, discipleship, finance, pastoral care, volunteers, assets, and AI intelligence in one workspace.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020266",
    theme_color: "#D4AF37",
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
        name: "Ministry Dashboard",
        short_name: "Dashboard",
        description: "Open the ministry overview dashboard.",
        url: "/",
      },
      {
        name: "Record Attendance",
        short_name: "Attendance",
        description: "Mark Sunday service attendance.",
        url: "/attendance",
      },
      {
        name: "Add Member",
        short_name: "New Member",
        description: "Register a new church member.",
        url: "/members?add=1",
      },
      {
        name: "Finance",
        short_name: "Finance",
        description: "View the church ledger and fund activity.",
        url: "/finance",
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
