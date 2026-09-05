import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silencia la advertencia de "workspace root" ambiguo — el repo tiene otro package-lock.json
  // en la raíz (el backend NestJS, un proyecto separado que solo comparte repositorio git).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
