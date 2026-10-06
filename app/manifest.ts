import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Duoeto", short_name: "Duoeto",
    description: "Conheça pessoas com mais contexto e respeito.",
    start_url: "/", display: "standalone",
    background_color: "#fbf9fe", theme_color: "#6841d4",
    icons: [{ src: "/brand/icon.png", sizes: "500x500", type: "image/png" }],
  };
}
