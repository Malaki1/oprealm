import { serveAssetForge } from "../_lib/asset-forge-shell.js";
export function onRequest({ request, env }) { return serveAssetForge(request, env); }
