import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dinner Randomizer",
    short_name: "Dinner",
    description: "Random meal planner for the week",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1e6",
    theme_color: "#d24a2c",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/dinner-icon.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
