import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function PrintHeader({ title, number }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      const data = await base44.entities.Settings.list();
      if (data.length > 0) setSettings(data[0]);
    }
    loadSettings();
  }, []);

  return (
    <div className="mb-8 pb-4 border-b-2 border-slate-900">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {settings?.company_logo ? (
            <img src={settings.company_logo} alt="Logo" className="h-16 mb-2" />
          ) : (
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">GestãoPro</h1>
          )}
          <p className="text-sm text-slate-600 font-semibold">{settings?.company_name || "Sistema de Gestão"}</p>
          {settings?.company_address && <p className="text-xs text-slate-500 mt-0.5">{settings.company_address}</p>}
          {(settings?.company_phone || settings?.company_email) && (
            <p className="text-xs text-slate-500">
              {settings.company_phone} {settings.company_phone && settings.company_email && "•"} {settings.company_email}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className="text-lg font-semibold text-slate-800">{title}</span>
          {number && <p className="text-lg text-slate-500">#{number}</p>}
        </div>
      </div>
    </div>
  );
}