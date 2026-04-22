import { useEffect, useState } from "react";
import { localClient } from "@/api/localClient";

const DEFAULT_NAME = "GestãoPro";
const CACHE_KEY = "appBrandingCache";

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export function useAppBranding() {
  const cached = readCache();
  const [branding, setBranding] = useState({
    appName: cached?.appName || DEFAULT_NAME,
    appLogo: cached?.appLogo || "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await localClient.entities.Settings.list();
        if (cancelled) return;
        const s = list[0] || {};
        const next = {
          appName: s.app_name && s.app_name.trim() ? s.app_name : DEFAULT_NAME,
          appLogo: s.app_logo || "",
        };
        setBranding(next);
        writeCache(next);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return branding;
}
