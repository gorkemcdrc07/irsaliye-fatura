import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": {
                target: "https://tms.odaklojistik.com.tr",
                changeOrigin: true,
                secure: false,
            },

            "/odak-api": {
                target: "https://api.odaklojistik.com.tr",
                changeOrigin: true,
                secure: false,
                rewrite: (path) =>
                    path.replace(/^\/odak-api/, ""),
            },
        },
    },
});