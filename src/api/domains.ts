import { useEffect, useState } from "react";
import type { Domain, User } from "../types";
import { apiRequest } from "./client";

export const domainsApi = {
  list: () => apiRequest<Domain[]>("/domains"),
  create: (name: string) => apiRequest<Domain>("/domains", { method: "POST", body: JSON.stringify({ name }) }),
  rename: (id: string, name: string) =>
    apiRequest<Domain>(`/domains/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  remove: (id: string) => apiRequest<void>(`/domains/${id}`, { method: "DELETE" }),
  setManagers: (id: string, userIds: string[]) =>
    apiRequest<Domain>(`/domains/${id}/managers`, { method: "PUT", body: JSON.stringify({ user_ids: userIds }) }),
  /** Admins only: active accounts with the manager role. */
  managerAccounts: () => apiRequest<User[]>("/users?role=manager"),
};

/** Every domain, loaded once per component; null while loading (or if loading failed). */
export function useDomains(): Domain[] | null {
  const [domains, setDomains] = useState<Domain[] | null>(null);
  useEffect(() => {
    domainsApi.list().then(setDomains).catch(() => setDomains([]));
  }, []);
  return domains;
}

/** The domain's name for an id stored in a job or an approval request. */
export function domainName(domains: Domain[] | null, id: unknown): string {
  if (id === null || id === undefined || id === "") return "(not set)";
  return domains?.find((d) => d.domain_id === id)?.name ?? (domains ? "(deleted domain)" : "…");
}
