import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Mercado Pago Node SDK uses Node.js APIs (crypto, http, etc.) that
  // must NOT be bundled by Next.js. Opting it out ensures native Node.js
  // require() is used, which is required by the SDK.
  serverExternalPackages: ["mercadopago"],
};

export default nextConfig;