import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Duoeto", short_name: "Duoeto",
    description: "Conheça pessoas com mais contexto e respeito.",
    start_url: "/", display: "standalone",
    background_color: "#F8FAFC", theme_color: "#5B8DEF",
    icons: [{ src: "/brand/icon.png", sizes: "500x500", type: "image/png" }],
  };
}
