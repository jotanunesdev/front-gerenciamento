import {
  LayoutDashboard,
  BarChart3,
  ListChecks,
  History,
  Workflow,
  Settings,
  ServerCog,
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
  /** Module not fully available yet (shows "em breve"). */
  comingSoon?: boolean;
  /** Navigation entries this module unlocks. */
  nav: ModuleNavItem[];
}

// Lista fixa de módulos disponíveis no sistema. Novos módulos são adicionados
// aqui no código; os admins apenas escolhem quais cada login pode enxergar.
export const MODULES: ModuleDefinition[] = [
  {
    key: "n8n",
    label: "n8n / Workflows",
    description: "Monitoramento das execuções dos workflows do n8n.",
    icon: Workflow,
    nav: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/analytics", label: "Análises", icon: BarChart3 },
      { to: "/executions", label: "Execuções", icon: ListChecks },
      { to: "/history", label: "Histórico", icon: History },
      { to: "/workflows", label: "Workflows", icon: Workflow },
      { to: "/settings", label: "Conexão", icon: Settings },
    ],
  },
  {
    key: "server_access",
    label: "Acesso a Servidores",
    description:
      "Monitoramento de acesso de terceiros aos servidores da empresa.",
    icon: ServerCog,
    comingSoon: true,
    nav: [
      { to: "/server-access", label: "Servidores", icon: ServerCog },
    ],
  },
];

export const MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);

export function getModule(key: ModuleKey): ModuleDefinition | undefined {
  return MODULES.find((m) => m.key === key);
}
