import "server-only";
export {
  normalizeUrl,
  isVercelDeployment,
  getDeploymentStage,
  isProductionDeployment,
  getDeploymentHostname,
  resolveAppBaseUrl,
  shouldUseSecureTransport,
} from "@/lib/runtime-config.mjs";
