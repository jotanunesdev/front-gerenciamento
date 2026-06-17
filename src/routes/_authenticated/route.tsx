import logo from "@/assets/logo.png";
import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, LogOut, Settings, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { managementApi } from "@/lib/api";
import { MODULES, type ModuleKey } from "@/lib/modules";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

const adminNavItems = [{ to: "/users", label: "Usuarios", icon: Users }];
const ACTIVE_MODULE_STORAGE_KEY = "flowcontrol:active-module";

function AuthenticatedLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: access } = useQuery({
    queryKey: ["users", "my-modules"],
    queryFn: () => managementApi.getModules(),
    retry: false,
    enabled: !!user,
  });

  const availableModules = useMemo(() => {
    const allowed = new Set((access?.modules ?? []) as ModuleKey[]);
    return MODULES.filter((moduleItem) => allowed.has(moduleItem.key));
  }, [access]);

  const [selectedKey, setSelectedKey] = useState<ModuleKey | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_MODULE_STORAGE_KEY) as ModuleKey | null;
      if (saved) setSelectedKey(saved);
    } catch {
      // noop
    }
  }, []);

  const pathModuleKey = useMemo(
    () =>
      availableModules.find((moduleItem) =>
        moduleItem.nav.some(
          (entry) => pathname === entry.to || pathname.startsWith(`${entry.to}/`),
        ),
      )?.key ?? null,
    [availableModules, pathname],
  );

  useEffect(() => {
    if (pathModuleKey && pathModuleKey !== selectedKey) {
      setSelectedKey(pathModuleKey);
      try {
        localStorage.setItem(ACTIVE_MODULE_STORAGE_KEY, pathModuleKey);
      } catch {
        // noop
      }
    }
  }, [pathModuleKey, selectedKey]);

  const activeKey = pathModuleKey ?? selectedKey ?? availableModules[0]?.key ?? null;
  const activeModule = availableModules.find((moduleItem) => moduleItem.key === activeKey) ?? null;
  const items = useMemo(() => {
    const moduleNav = activeModule ? activeModule.nav : [];
    return access?.isAdmin ? [...moduleNav, ...adminNavItems] : moduleNav;
  }, [access, activeModule]);

  const switchModule = (key: ModuleKey) => {
    const moduleItem = availableModules.find((entry) => entry.key === key);
    setSelectedKey(key);
    try {
      localStorage.setItem(ACTIVE_MODULE_STORAGE_KEY, key);
    } catch {
      // noop
    }
    if (moduleItem?.nav[0]) {
      navigate({ to: moduleItem.nav[0].to });
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, navigate, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);
  const initials = (user.displayName ?? user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link
            to={activeModule?.nav[0]?.to ?? "/dashboard"}
            className="flex items-center gap-2.5 px-2 py-1.5"
          >
            <img src={logo} alt="FlowControl" className="h-8 w-8 shrink-0 object-contain" />
            <span className="truncate text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
              FlowControl
            </span>
          </Link>

          {availableModules.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="mt-1 flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-100 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                  disabled={availableModules.length <= 1}
                >
                  {activeModule ? <activeModule.icon className="h-4 w-4 shrink-0 text-primary" /> : null}
                  <span className="min-w-0 flex-1 truncate text-left group-data-[collapsible=icon]:hidden">
                    {activeModule?.label ?? "Modulo"}
                  </span>
                  {availableModules.length > 1 ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              {availableModules.length > 1 ? (
                <DropdownMenuContent align="start" className="w-60">
                  <DropdownMenuLabel className="text-muted-foreground">Modulos</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableModules.map((moduleItem) => (
                    <DropdownMenuItem
                      key={moduleItem.key}
                      onClick={() => switchModule(moduleItem.key)}
                      className="gap-2"
                    >
                      <moduleItem.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{moduleItem.label}</span>
                      {moduleItem.key === activeKey ? <Check className="h-4 w-4 text-primary" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              ) : null}
            </DropdownMenu>
          ) : null}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegacao</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                      <Link to={item.to}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2 py-1.5 text-sm transition-colors hover:bg-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {initials}
                </span>
                <span className="min-w-0 flex-1 truncate text-left text-muted-foreground group-data-[collapsible=icon]:hidden">
                  {user.displayName ?? user.email}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                {user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <User className="mr-2 h-4 w-4" /> Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" /> Conexao
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
          <SidebarTrigger />
          <span className="text-sm font-medium text-muted-foreground">
            {activeModule?.label ?? "FlowControl"}
          </span>
        </header>
        <main className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-12 md:py-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
