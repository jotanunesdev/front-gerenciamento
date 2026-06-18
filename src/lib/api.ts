import type { ModuleKey } from "@/lib/modules";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:3015";
const configuredTrafficApiBaseUrl =
  (import.meta.env.VITE_TRAFFIC_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "https://apifluig.jotanunes.com";
const TRAFFIC_API_BASE_URL =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8080"
    : configuredTrafficApiBaseUrl;

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export interface AppAuthUser {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  modules: ModuleKey[];
}

export interface AccessPayload {
  isAdmin: boolean;
  modules: ModuleKey[];
}

export interface ProfilePayload {
  displayName: string;
  email: string;
}

export interface AppUserItem {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  modules: ModuleKey[];
  authProvider: string;
  createdAt: string | null;
  lastSignInAt: string | null;
}

export interface N8nConnectionPayload {
  connected: boolean;
  id?: string;
  name?: string;
  baseUrl?: string;
  updatedAt?: string;
}

export interface N8nWorkflowItem {
  id: string;
  name: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  nodeCount: number;
}

export interface N8nExecutionItem {
  id: string;
  workflowId: string | null;
  workflowName: string | null;
  status: string;
  mode: string | null;
  startedAt: string | null;
  stoppedAt: string | null;
  finished: boolean;
}

export interface N8nExecutionDetail {
  id: string;
  workflowId: string | null;
  workflowName: string | null;
  status: string;
  mode: string | null;
  startedAt: string | null;
  stoppedAt: string | null;
  finished: boolean;
  lastNodeExecuted: string | null;
  topError: {
    node: string;
    message: string;
    description: string | null;
    stack: string | null;
  } | null;
  nodeErrors: Array<{
    node: string;
    message: string;
    description: string | null;
  }>;
  executedNodes: string[];
}

export interface HistoryStatsPayload {
  totals: {
    workflows: number;
    activeWorkflows: number;
    executions: number;
    success: number;
    error: number;
    errorReal: number;
    errorManual: number;
    running: number;
    waiting: number;
    successRate: number;
    autoSuccessRate: number;
    avgDurationMs: number | null;
    todayTotal: number;
    todaySuccess: number;
    todayError: number;
    todayErrorReal: number;
    todayErrorManual: number;
    todayManual: number;
    todayAuto: number;
  };
  modeBreakdown: {
    manual: number;
    auto: number;
    webhook: number;
    sub: number;
    other: number;
  };
  hourly: Array<{ hour: number; total: number; success: number; error: number }>;
  weekday: Array<{ day: number; total: number; error: number }>;
  timeline: Array<{ date: string; success: number; error: number }>;
  topWorkflows: Array<{
    id: string;
    name: string;
    active: boolean;
    total: number;
    success: number;
    errors: number;
    running: number;
    waiting: number;
    manual: number;
    avgDurationMs: number | null;
  }>;
  allWorkflows: Array<{
    id: string;
    name: string;
    active: boolean;
    total: number;
    success: number;
    errors: number;
    running: number;
    waiting: number;
    manual: number;
    avgDurationMs: number | null;
  }>;
  topErrorWorkflows: Array<{
    id: string;
    name: string;
    active: boolean;
    total: number;
    success: number;
    errors: number;
    running: number;
    waiting: number;
    manual: number;
    avgDurationMs: number | null;
  }>;
  slowestWorkflows: Array<{
    id: string;
    name: string;
    active: boolean;
    total: number;
    success: number;
    errors: number;
    running: number;
    waiting: number;
    manual: number;
    avgDurationMs: number | null;
  }>;
  recentErrors: Array<{
    id: string;
    workflowId: string | null;
    workflowName: string | null;
    mode: string | null;
    startedAt: string | null;
  }>;
  workflowOptions: Array<{ id: string; name: string }>;
  selectedWorkflowId: string | null;
}

export interface WorkflowDetailPayload {
  workflow: {
    id: string;
    name: string;
    active: boolean;
  };
  totals: {
    executions: number;
    success: number;
    error: number;
    errorReal: number;
    errorManual: number;
    running: number;
    waiting: number;
    successRate: number;
    avgDurationMs: number | null;
  };
  timeline: Array<{ date: string; success: number; error: number }>;
  recent: N8nExecutionItem[];
}

export interface SyncResult {
  ok: true;
  fetched: number;
  saved: number;
  deleted: number;
  total: number;
}

export interface NotConnectedPayload {
  notConnected: true;
}

export interface TrafficDashboardPayload {
  generatedAtUtc: string;
  periodFromUtc: string;
  periodToUtc: string;
  summary: {
    totalRequests: number;
    averageDurationMs: number;
    errorRequests: number;
    errorRate: number;
    requestsPerMinute: number;
    peakRequestsPerMinute: number;
    uniqueUsers: number;
    uniqueSystems: number;
  };
  statusCodes: Array<{ statusCode: number; total: number }>;
  timeline: Array<{
    timestampUtc: string;
    total: number;
    errors: number;
    averageDurationMs: number;
  }>;
  requestsPerMinute: Array<{ timestampUtc: string; total: number }>;
  errors500ByHour: Array<{ timestampUtc: string; total: number }>;
  topEndpoints: TrafficEndpointMetric[];
  slowestEndpoints: TrafficEndpointMetric[];
  topErrorEndpoints: TrafficEndpointMetric[];
  slowestEndpointsByUser: Array<{
    userName: string;
    httpMethod: string;
    endpoint: string;
    total: number;
    averageDurationMs: number;
    maximumDurationMs: number;
  }>;
  topConsumers: Array<{
    consumer: string;
    consumerType: "user" | "system";
    total: number;
    errors: number;
    averageDurationMs: number;
  }>;
  topUsers: Array<{
    userName: string;
    total: number;
    errors: number;
    averageDurationMs: number;
  }>;
  requestsByApi: Array<{ name: string; total: number }>;
  requestsByEnvironment: Array<{ name: string; total: number }>;
  recentErrors: Array<{
    requestedAtUtc: string;
    httpMethod: string;
    endpoint: string;
    statusCode: number;
    durationMs: number;
    userName: string;
    sourceSystem: string | null;
    traceId: string | null;
  }>;
  filters: {
    apiNames: string[];
    environments: string[];
  };
}

export interface TrafficEndpointMetric {
  httpMethod: string;
  endpoint: string;
  total: number;
  errors: number;
  averageDurationMs: number;
  maximumDurationMs: number;
}

export interface LoadTestProfilePayload {
  key: string;
  name: string;
  description: string;
  scriptName: string;
  expectedDurationSeconds: number;
  maxVirtualUsers: number;
}

export interface LoadTestThresholdResultPayload {
  metric: string;
  passed: boolean;
  rules: string[];
}

export interface LoadTestTimelinePointPayload {
  timestampUtc: string;
  elapsedSeconds: number;
  requests: number;
  failures: number;
  averageDurationMs: number;
  p95DurationMs: number;
  activeVirtualUsers: number;
}

export interface LoadTestEndpointMetricPayload {
  name: string;
  httpMethod: string;
  endpoint: string;
  executionMode: "real" | "dry-run" | "discovery";
  requests: number;
  failures: number;
  errorRate: number;
  averageDurationMs: number;
  minimumDurationMs: number;
  maximumDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
}

export interface LoadTestCapacityResultPayload {
  maximumTargetUsers: number;
  peakObservedUsers: number;
  estimatedLimitUsers: number;
  failureStartedAtUsers: number | null;
  stopReason: "running" | "api-unavailable" | "maximum-reached" | "interrupted";
}

export interface LoadTestRunListItemPayload {
  runId: string;
  profileKey: string;
  profileName: string;
  status: string;
  targetBaseUrl: string;
  triggeredBy: string;
  startedAtUtc: string;
  finishedAtUtc: string | null;
  expectedDurationSeconds: number;
  totalRequests: number;
  failedRequests: number;
  errorRate: number;
  averageDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  peakVirtualUsers: number;
  maxRequestsPerSecond: number;
  thresholdsPassed: boolean | null;
}

export interface LoadTestRunDetailPayload extends LoadTestRunListItemPayload {
  progressPercent: number;
  currentVirtualUsers: number;
  summaryJson: string | null;
  capacityResult: LoadTestCapacityResultPayload | null;
  thresholdResults: LoadTestThresholdResultPayload[];
  timeline: LoadTestTimelinePointPayload[];
  endpointMetrics: LoadTestEndpointMetricPayload[];
}

export interface EntraAuthorizeUrlPayload {
  authorizationUrl: string;
  redirectUri?: string;
  state?: string | null;
}

export function isNotConnectedPayload(value: unknown): value is NotConnectedPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "notConnected" in value &&
    (value as { notConnected?: unknown }).notConnected === true
  );
}

async function apiRequestFrom<T>(
  baseUrl: string,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  let body = options.body;

  if (body != null && !(body instanceof FormData)) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(body);
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    ...options,
    headers,
    body: body as BodyInit | null | undefined,
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null
        ? ((payload as Record<string, unknown>).error ??
          (payload as Record<string, unknown>).message ??
          (payload as Record<string, unknown>).detail ??
          "Falha ao comunicar com a API.")
        : "Falha ao comunicar com a API.";
    throw new Error(String(message));
  }

  return payload as T;
}

const apiRequest = <T>(path: string, options: ApiRequestOptions = {}) =>
  apiRequestFrom<T>(API_BASE_URL, path, options);

export const sessionApi = {
  login(username: string, password: string) {
    return apiRequest<{ ok?: boolean; authenticated?: boolean }>(
      "/inadimplencia/session/entra/login",
      {
        method: "POST",
        body: { username, password },
      },
    );
  },
  getAuthorizeUrl(params: {
    redirectUri: string;
    state: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    prompt?: string;
  }) {
    const search = new URLSearchParams({
      redirectUri: params.redirectUri,
      state: params.state,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
    });
    if (params.prompt) search.set("prompt", params.prompt);
    return apiRequest<EntraAuthorizeUrlPayload>(
      `/inadimplencia/session/entra/authorize-url?${search.toString()}`,
    );
  },
  exchangeAuthorizationCode(input: { code: string; redirectUri: string; codeVerifier: string }) {
    return apiRequest<{ authenticated?: boolean; error?: string }>(
      "/inadimplencia/session/entra/token",
      {
        method: "POST",
        body: input,
      },
    );
  },
  logout() {
    return apiRequest<{ ok: boolean }>("/inadimplencia/session", { method: "DELETE" });
  },
};

export const managementApi = {
  getMe() {
    return apiRequest<{ user: AppAuthUser }>("/management/me");
  },
  getModules() {
    return apiRequest<AccessPayload>("/management/modules/me");
  },
  getRole() {
    return apiRequest<{ isAdmin: boolean }>("/management/role");
  },
  getProfile() {
    return apiRequest<ProfilePayload>("/management/profile");
  },
  updateProfile(displayName: string) {
    return apiRequest<{ ok: boolean; error?: string }>("/management/profile", {
      method: "PUT",
      body: { displayName },
    });
  },
  listUsers() {
    return apiRequest<{ users: AppUserItem[] }>("/management/users");
  },
  createUser(input: {
    email: string;
    displayName?: string;
    authMethod: "password" | "microsoft";
    isAdmin: boolean;
    modules?: ModuleKey[];
  }) {
    return apiRequest<{ ok: boolean; error?: string }>("/management/users", {
      method: "POST",
      body: input,
    });
  },
  updateUserModules(userId: string, modules: ModuleKey[]) {
    return apiRequest<{ ok: boolean; error?: string }>(`/management/users/${userId}/modules`, {
      method: "PUT",
      body: { modules },
    });
  },
  deleteUser(userId: string) {
    return apiRequest<{ ok: boolean; error?: string }>(`/management/users/${userId}`, {
      method: "DELETE",
    });
  },
  getConnection() {
    return apiRequest<N8nConnectionPayload>("/management/n8n/connection");
  },
  saveConnection(input: { name: string; baseUrl: string; apiKey?: string }) {
    return apiRequest<{ ok: boolean; error?: string }>("/management/n8n/connection", {
      method: "PUT",
      body: input,
    });
  },
  deleteConnection() {
    return apiRequest<{ ok: boolean }>("/management/n8n/connection", {
      method: "DELETE",
    });
  },
  listWorkflows() {
    return apiRequest<{ workflows: N8nWorkflowItem[] } | NotConnectedPayload>(
      "/management/n8n/workflows",
    );
  },
  getWorkflowDetail(id: string) {
    return apiRequest<WorkflowDetailPayload | NotConnectedPayload>(
      `/management/n8n/workflows/${encodeURIComponent(id)}`,
    );
  },
  getExecution(id: string) {
    return apiRequest<N8nExecutionDetail | NotConnectedPayload>(
      `/management/n8n/executions/${encodeURIComponent(id)}`,
    );
  },
  syncExecutions() {
    return apiRequest<SyncResult | NotConnectedPayload>("/management/n8n/sync", {
      method: "POST",
    });
  },
  listHistory(params: { status: string; page: number; pageSize: number }) {
    const search = new URLSearchParams({
      status: params.status,
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    return apiRequest<
      | { executions: N8nExecutionItem[]; total: number; page: number; pageSize: number }
      | NotConnectedPayload
    >(`/management/n8n/history?${search.toString()}`);
  },
  listStoredExecutions() {
    return apiRequest<{ executions: N8nExecutionItem[] } | NotConnectedPayload>(
      "/management/n8n/stored-executions",
    );
  },
  getHistoryStats(params: { periodDays: number; workflowId?: string; windowed?: boolean }) {
    const search = new URLSearchParams({
      periodDays: String(params.periodDays),
    });
    if (params.workflowId) search.set("workflowId", params.workflowId);
    if (params.windowed != null) search.set("windowed", String(params.windowed));
    return apiRequest<HistoryStatsPayload | NotConnectedPayload>(
      `/management/n8n/stats?${search.toString()}`,
    );
  },
};

export const trafficMonitoringApi = {
  getDashboard(params: {
    periodDays: number;
    apiName?: string;
    environment?: string;
    excludeLoadTestTraffic?: boolean;
  }) {
    const search = new URLSearchParams({
      periodDays: String(params.periodDays),
    });
    if (params.apiName) search.set("apiName", params.apiName);
    if (params.environment) search.set("environment", params.environment);
    if (params.excludeLoadTestTraffic) search.set("excludeLoadTestTraffic", "true");

    return apiRequestFrom<TrafficDashboardPayload>(
      TRAFFIC_API_BASE_URL,
      `/traffic-monitoring/dashboard?${search.toString()}`,
    );
  },
  listLoadTestProfiles() {
    return apiRequestFrom<{ profiles: LoadTestProfilePayload[] }>(
      TRAFFIC_API_BASE_URL,
      "/traffic-monitoring/load-tests/profiles",
    );
  },
  listLoadTestRuns(limit = 25) {
    return apiRequestFrom<{ runs: LoadTestRunListItemPayload[] }>(
      TRAFFIC_API_BASE_URL,
      `/traffic-monitoring/load-tests/runs?limit=${limit}`,
    );
  },
  getLoadTestRun(runId: string) {
    return apiRequestFrom<LoadTestRunDetailPayload>(
      TRAFFIC_API_BASE_URL,
      `/traffic-monitoring/load-tests/runs/${encodeURIComponent(runId)}`,
    );
  },
  startLoadTest(input: { profileKey: string; targetBaseUrl?: string }) {
    return apiRequestFrom<LoadTestRunDetailPayload>(
      TRAFFIC_API_BASE_URL,
      "/traffic-monitoring/load-tests/runs",
      {
        method: "POST",
        body: input,
      },
    );
  },
};

export function getApiBaseUrl() {
  return API_BASE_URL;
}
