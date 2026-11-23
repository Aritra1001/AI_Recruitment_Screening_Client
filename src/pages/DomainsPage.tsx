import { useCallback, useEffect, useState, type FormEvent } from "react";
import { domainsApi } from "../api/domains";
import { Alert } from "../components/Alert";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { Domain, User } from "../types";

/** Admins: domains (Software, Data Engineering, …) and the managers who screen their jobs'
 * shortlisted resumes. Changes here apply straight away (no second-admin approval). */
export function DomainsPage() {
  const [domains, setDomains] = useState<Domain[] | null>(null);
  const [managers, setManagers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<Domain | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    domainsApi.list().then(setDomains).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
    domainsApi.managerAccounts().then(setManagers).catch((e: Error) => setError(e.message));
  }, [load]);

  function replace(updated: Domain) {
    setDomains((prev) => prev?.map((d) => (d.domain_id === updated.domain_id ? updated : d)) ?? null);
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const created = await domainsApi.create(newName.trim());
      setNewName("");
      setFlash(`Added "${created.name}". Assign its managers below.`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await domainsApi.remove(toDelete.domain_id);
      setFlash(`Deleted "${toDelete.name}".`);
      setToDelete(null);
      load();
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Domains</h1>
          <p className="muted">
            Every job belongs to a domain. Its managers decide which shortlisted candidates get an interview.
          </p>
        </div>
      </div>

      <Alert kind="success" onClose={() => setFlash(null)}>
        {flash}
      </Alert>
      <Alert kind="error" onClose={() => setError(null)}>
        {error}
      </Alert>

      <form className="card domain-add" onSubmit={add}>
        <label htmlFor="new-domain">New domain</label>
        <div className="inline-form">
          <input
            id="new-domain"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Data Engineering"
            maxLength={100}
            required
          />
          <button className="btn btn-primary" disabled={adding || !newName.trim()}>
            {adding ? "Adding…" : "Add domain"}
          </button>
        </div>
      </form>

      {managers?.length === 0 && (
        <Alert kind="info">
          There are no manager accounts yet. Create one with{" "}
          <code>python -m app.create_user --email … --name "…" --role manager</code>, then assign it here.
        </Alert>
      )}

      {domains === null ? (
        <div className="page-status">Loading domains…</div>
      ) : domains.length === 0 ? (
        <div className="card page-status">No domains yet. Add the first one above.</div>
      ) : (
        <div className="domain-list">
          {domains.map((d) => (
            <DomainCard
              key={d.domain_id}
              domain={d}
              managerAccounts={managers}
              onChange={replace}
              onDelete={() => {
                setDeleteError(null);
                setToDelete(d);
              }}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete domain?"
        confirmLabel="Delete"
        danger
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      >
        <p>
          Delete <strong>{toDelete?.name}</strong>? Its managers are unassigned; their accounts stay.
        </p>
      </ConfirmDialog>
    </>
  );
}

interface CardProps {
  domain: Domain;
  managerAccounts: User[] | null;
  onChange: (d: Domain) => void;
  onDelete: () => void;
}

function DomainCard({ domain, managerAccounts, onChange, onDelete }: CardProps) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(domain.name);
  const [editing, setEditing] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<Domain>, after: () => void) {
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
      after();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function startEditing() {
    setChosen(new Set(domain.managers.map((m) => m.user_id)));
    setEditing(true);
  }

  function toggle(id: string) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="card domain-card">
      <div className="domain-head">
        {renaming ? (
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => domainsApi.rename(domain.domain_id, name.trim()), () => setRenaming(false));
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required aria-label="Domain name" />
            <button className="btn btn-primary btn-sm" disabled={busy || !name.trim()}>
              Save
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setName(domain.name);
                setRenaming(false);
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <div>
            <h2>{domain.name}</h2>
            <p className="muted">
              {domain.job_count} {domain.job_count === 1 ? "job" : "jobs"}
            </p>
          </div>
        )}
        {!renaming && (
          <div className="header-actions">
            <button className="btn btn-sm" onClick={() => setRenaming(true)}>
              Rename
            </button>
            <button
              className="btn btn-sm btn-danger-outline"
              onClick={onDelete}
              disabled={domain.job_count > 0}
              title={domain.job_count > 0 ? "Move its jobs to another domain first" : undefined}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <h3>Managers</h3>
      {!editing ? (
        <div className="domain-managers">
          {domain.managers.length === 0 ? (
            <p className="muted">No managers yet, so resumes for its jobs can't be sent for screening.</p>
          ) : (
            <ul className="chip-list">
              {domain.managers.map((m) => (
                <li key={m.user_id} className="chip" title={m.email}>
                  {m.full_name}
                </li>
              ))}
            </ul>
          )}
          <button className="btn btn-sm" onClick={startEditing} disabled={!managerAccounts?.length}>
            Edit managers
          </button>
        </div>
      ) : (
        <div className="domain-managers-edit">
          <div className="pick-list">
            {managerAccounts?.map((m) => (
              <label key={m.user_id} className="check-row">
                <input type="checkbox" checked={chosen.has(m.user_id)} onChange={() => toggle(m.user_id)} />
                <span className="pick-name">{m.full_name}</span>
                <span className="muted pick-note">{m.email}</span>
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => run(() => domainsApi.setManagers(domain.domain_id, [...chosen]), () => setEditing(false))}
            >
              {busy ? "Saving…" : "Save managers"}
            </button>
          </div>
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}
    </section>
  );
}
