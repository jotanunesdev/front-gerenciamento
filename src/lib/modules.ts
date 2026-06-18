import {
  LayoutDashboard,
  BarChart3,
  ListChecks,
  History,
  Workflow,
  Settings,
  ServerCog,
  Flame,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey = "n8n" | "server_access";

export interface ModuleNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  nav: ModuleNavItem[];
}

export const MODULES: ModuleDefinition[] = [
  {
    key: "n8n",
    label: "n8n / Workflows",
    description: "Monitoramento das execucoes dos workflows do n8n.",
    icon: Workflow,
    nav: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/analytics", label: "Analises", icon: BarChart3 },
      { to: "/executions", label: "Execucoes", icon: ListChecks },
      { to: "/history", label: "Historico", icon: History },
      { to: "/workflows", label: "Workflows", icon: Workflow },
      { to: "/settings", label: "Conexao", icon: Settings },
    ],
  },
  {
    key: "server_access",
    label: "Acesso a Servidores",
    description: "Auditoria de consumo, desempenho e erros das APIs corporativas.",
    icon: ServerCog,
    nav: [
      { to: "/server-access", label: "Trafego de APIs", icon: ServerCog },
      { to: "/server-access/load-tests", label: "Teste de Carga", icon: Flame },
    ],
  },
];

export const MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);

export function getModule(key: ModuleKey): ModuleDefinition | undefined {
  return MODULES.find((m) => m.key === key);
}
