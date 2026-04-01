import { useState, useEffect, useRef } from "react";
import { localClient } from "@/api/localClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import {
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Link,
  Bot,
  Info,
} from "lucide-react";

const STATUS_POLL_INTERVAL = 3000;

export default function WhatsAppSettings() {
  const { user } = useAuth();
  const [waStatus, setWaStatus] = useState("disconnected");
  const [qrImage, setQrImage] = useState(null);
  const [settings, setSettings] = useState({ app_url: "", auto_connect: false });
  const [detectedUrl, setDetectedUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  useEffect(() => {
    if (user?.role !== "admin") return;
    loadSettings();
    startPolling();
    return () => stopPolling();
  }, [user]);

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(fetchStatus, STATUS_POLL_INTERVAL);
    fetchStatus();
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function fetchStatus() {
    try {
      const data = await localClient.whatsapp.status();
      setWaStatus(data.status);
      setQrImage(data.qr || null);
    } catch {
      setWaStatus("disconnected");
    }
  }

  async function loadSettings() {
    try {
      const data = await localClient.whatsapp.getSettings();
      setDetectedUrl(data.detected_url || "");
      setSettings({
        app_url: data.app_url || data.detected_url || "",
        auto_connect: data.auto_connect || false,
      });
    } catch {
      toast.error("Erro ao carregar configurações do WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      await localClient.whatsapp.connect();
      toast.success("Iniciando conexão. Aguarde o QR Code...");
    } catch {
      toast.error("Erro ao iniciar conexão com WhatsApp.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setConnecting(true);
    try {
      await localClient.whatsapp.disconnect();
      setQrImage(null);
      setWaStatus("disconnected");
      toast.success("WhatsApp desconectado com sucesso.");
    } catch {
      toast.error("Erro ao desconectar WhatsApp.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSaveSettings() {
    setSaving(true);
    try {
      await localClient.whatsapp.saveSettings(settings);
      toast.success("Configurações salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-16">
        <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Acesso restrito a administradores</p>
      </div>
    );
  }

  const statusConfig = {
    connected: {
      label: "Conectado",
      color: "bg-green-100 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      dot: "bg-green-500",
    },
    connecting: {
      label: "Conectando...",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />,
      dot: "bg-yellow-500 animate-pulse",
    },
    qr: {
      label: "Aguardando leitura do QR Code",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      icon: <Smartphone className="h-4 w-4 text-blue-600" />,
      dot: "bg-blue-500 animate-pulse",
    },
    disconnected: {
      label: "Desconectado",
      color: "bg-slate-100 text-slate-600 border-slate-200",
      icon: <XCircle className="h-4 w-4 text-slate-400" />,
      dot: "bg-slate-400",
    },
  };

  const sc = statusConfig[waStatus] || statusConfig.disconnected;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-green-600" />
          Integração WhatsApp
        </h1>
        <p className="text-slate-500 mt-0.5">
          Conecte o WhatsApp da empresa e ative o atendimento automático para clientes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {waStatus === "connected" ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-slate-400" />
              )}
              Status da Conexão
            </span>
            <button
              onClick={fetchStatus}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="Atualizar status"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${sc.color}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
            {sc.icon}
            <span className="font-medium text-sm">{sc.label}</span>
          </div>

          {waStatus === "qr" && qrImage && (
            <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm font-semibold text-slate-700 text-center">
                Escaneie o QR Code com o WhatsApp do celular da empresa
              </p>
              <img
                src={qrImage}
                alt="QR Code WhatsApp"
                className="w-56 h-56 rounded-lg border-4 border-white shadow-lg"
              />
              <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-3 max-w-xs">
                <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                <span>
                  Abra o WhatsApp → Menu → Dispositivos vinculados → Vincular um dispositivo → Escaneie este QR Code
                </span>
              </div>
            </div>
          )}

          {waStatus === "connected" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>WhatsApp conectado e bot ativo! Mensagens recebidas serão respondidas automaticamente.</span>
            </div>
          )}

          <div className="flex gap-3">
            {waStatus === "disconnected" && (
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4 mr-2" />
                )}
                {connecting ? "Conectando..." : "Conectar WhatsApp"}
              </Button>
            )}

            {(waStatus === "connected" || waStatus === "qr" || waStatus === "connecting") && (
              <Button
                onClick={handleDisconnect}
                disabled={connecting}
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <WifiOff className="h-4 w-4 mr-2" />
                )}
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-600" />
            Configurações do Bot
          </CardTitle>
          <CardDescription>
            Configure o comportamento do atendimento automático via WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="flex items-center gap-1.5">
              <Link className="h-3.5 w-3.5" />
              URL do Sistema (para links nos menus)
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={settings.app_url}
                onChange={(e) => setSettings((p) => ({ ...p, app_url: e.target.value }))}
                placeholder="https://seu-app.replit.app"
              />
              {detectedUrl && settings.app_url !== detectedUrl && (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 text-xs px-3"
                  onClick={() => setSettings((p) => ({ ...p, app_url: detectedUrl }))}
                >
                  Usar atual
                </Button>
              )}
            </div>
            <div className="mt-2 space-y-1">
              {detectedUrl && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1.5 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>URL detectada automaticamente: <strong>{detectedUrl}</strong></span>
                </p>
              )}
              <p className="text-xs text-slate-500">
                É a URL desta aplicação. O bot usa esse link para mandar ao cliente quando ele pede orçamento ou quer ver suas O.S. Se publicar o app, atualize aqui com a nova URL.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-slate-700">Conectar automaticamente ao iniciar</p>
              <p className="text-xs text-slate-500">
                Ao reiniciar o servidor, tentará reconectar sem precisar clicar em "Conectar".
              </p>
            </div>
            <Switch
              checked={settings.auto_connect}
              onCheckedChange={(v) => setSettings((p) => ({ ...p, auto_connect: v }))}
            />
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Menu do Bot (o que o cliente vê)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-800 text-green-400 rounded-lg p-4 font-mono text-xs leading-relaxed space-y-1">
            <p className="text-white">Olá! 👋 (Nome do Cliente), bem-vindo ao atendimento automático!</p>
            <p className="text-slate-400 mt-1">Escolha uma opção:</p>
            <p className="mt-1">1️⃣ Solicitar orçamento</p>
            <p>2️⃣ Consultar meus orçamentos</p>
            <p>3️⃣ Acompanhar status da minha O.S.</p>
            <p>4️⃣ Falar com suporte</p>
            <p className="text-slate-500 mt-1 italic">Responda com o número da opção desejada.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
