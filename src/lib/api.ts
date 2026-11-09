import type {
  BackupStatus,
  CategoryDef,
  CreateCategoryInput,
  ClassifierStatus,
  ClassifyRequest,
  ClassifyResult,
  CreateItemInput,
  Item,
  ItemQuery,
  Settings,
  SettingsPatch,
  UpdateCategoryInput,
  UpdateItemInput,
} from "../../shared/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // Not JSON; keep the status line.
    }
    throw new Error(message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export const api = {
  categories: () => request<CategoryDef[]>("/categories"),

  createCategory: (input: CreateCategoryInput) => request<CategoryDef[]>("/categories", json("POST", input)),

  updateCategory: (slug: string, patch: UpdateCategoryInput) =>
    request<CategoryDef[]>(`/categories/${encodeURIComponent(slug)}`, json("PATCH", patch)),

  deleteCategory: (slug: string) =>
    request<{ categories: CategoryDef[]; kept: number; toInbox: number }>(`/categories/${encodeURIComponent(slug)}`, { method: "DELETE" }),

  items: (query: ItemQuery = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
    const qs = params.toString();
    return request<Item[]>(`/items${qs ? `?${qs}` : ""}`, { signal });
  },

  createItem: (input: CreateItemInput) => request<Item>("/items", json("POST", input)),

  updateItem: (id: string, patch: UpdateItemInput) =>
    request<Item>(`/items/${encodeURIComponent(id)}`, json("PATCH", patch)),

  deleteItem: (id: string) => request<void>(`/items/${encodeURIComponent(id)}`, { method: "DELETE" }),

  classify: (input: ClassifyRequest, signal?: AbortSignal) =>
    request<ClassifyResult>("/classify", { ...json("POST", input), signal }),

  classifierStatus: () => request<ClassifierStatus>("/classify/status"),

  backupStatus: () => request<BackupStatus>("/backup"),

  runBackup: () => request<BackupStatus>("/backup", { method: "POST" }),

  settings: () => request<Settings>("/settings"),

  updateSettings: (patch: SettingsPatch) => request<Settings>("/settings", json("PATCH", patch)),
};
