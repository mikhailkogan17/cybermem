"use client";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/lib/data/dashboard-context";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import ConfigPreview from "./mcp/config-preview";
import PlatformSelector from "./mcp/platform-selector";

export default function MCPConfigModal({ onClose }: { onClose: () => void }) {
  const { clientConfigs } = useDashboard();
  const clients = clientConfigs;

  // State
  const [selectedClient, setSelectedClient] = useState("claude");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:8080");
  const [isManaged, setIsManaged] = useState(false);
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  // Config State (Fetched from API)
  const [configContent, setConfigContent] = useState("");
  const [configType, setConfigType] = useState("json");

  // selectedConfig object
  const selectedConfig = (clients as any[]).find(
    (c) => c.id === selectedClient,
  );

  // 1. Initial Load: Get Settings (API Key, Base URL, Managed Status)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const localKey = localStorage.getItem("om_api_key");
        const res = await fetch("/api/settings");
        const data = await res.json();

        // Resolving Endpoint (Localhost Fix)
        let srvEndpoint = data.endpoint;
        if (
          srvEndpoint.includes("localhost") &&
          typeof window !== "undefined" &&
          !window.location.hostname.includes("localhost")
        ) {
          const port = srvEndpoint.split(":").pop()?.split("/")[0] || "8626";
          srvEndpoint = `${window.location.protocol}//${window.location.hostname}:${port}`;
        }

        setBaseUrl(srvEndpoint);
        setIsManaged(data.isManaged || false);

        if (localKey) {
          setApiKey(localKey);
        } else {
          setApiKey(data.apiKey !== "not-set" ? data.apiKey : "");
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // 2. Fetch Config when Dependencies Change
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const params = new URLSearchParams({
          client: selectedClient,
          mask: (!isKeyVisible).toString(),
          baseUrl: baseUrl,
        });

        const res = await fetch(`/api/mcp-config?${params.toString()}`);
        const data = await res.json();

        if (data.config) {
          setConfigContent(
            typeof data.config === "object"
              ? JSON.stringify(data.config, null, 2)
              : data.config,
          );
          setConfigType(data.configType);
        }
      } catch (err) {
        console.error("Failed to fetch MCP config:", err);
        setConfigContent("// Failed to load config");
      }
    };

    if (baseUrl) {
      fetchConfig();
    }
  }, [selectedClient, isKeyVisible, baseUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-6xl bg-[#05100F] backdrop-blur-xl border-[0.5px] border-white/10 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] relative overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle at 0% 0%, oklch(0.7 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, oklch(0.65 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%)
          `,
        }}
      >
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-6 right-6 z-10 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Layout */}
        <div className="flex flex-1 min-h-0">
          <PlatformSelector
            clients={clients}
            selectedClient={selectedClient}
            onSelect={setSelectedClient}
          />

          <ConfigPreview
            selectedConfig={selectedConfig}
            configContent={configContent}
            configType={configType}
            isManaged={isManaged}
            isKeyVisible={isKeyVisible}
            onToggleKeyVisibility={() => setIsKeyVisible(!isKeyVisible)}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
