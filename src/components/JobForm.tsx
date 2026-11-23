import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useDomains } from "../api/domains";
import type { Job, JobInput } from "../types";

interface Props {
  initial?: Job;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: JobInput) => void;
  onCancel: () => void;
}

/** One skill per line; leading bullets ("-", "*", "•") and blank lines are dropped. */
export function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

export function JobForm({ initial, submitLabel, busy, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [required, setRequired] = useState((initial?.required_skills ?? []).join("\n"));
  const [preferred, setPreferred] = useState((initial?.preferred_skills ?? []).join("\n"));
  const [experience, setExperience] = useState(initial?.minimum_experience?.toString() ?? "");
  const [domainId, setDomainId] = useState(initial?.domain?.domain_id ?? "");
  const [minScore, setMinScore] = useState(String(initial?.shortlist_min_score ?? 60));
  const domains = useDomains();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      required_skills: parseLines(required),
      preferred_skills: parseLines(preferred),
      minimum_experience: experience.trim() === "" ? null : Number(experience),
      domain_id: domainId || null,
      shortlist_min_score: Number(minScore),
    });
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={255} />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={6} />
      </label>
      <div className="form-row">
        <label>
          Required skills <small>(one per line)</small>
          <textarea
            value={required}
            onChange={(e) => setRequired(e.target.value)}
            rows={6}
            placeholder={"Python\nFastAPI\n5+ years experience"}
          />
        </label>
        <label>
          Preferred skills <small>(one per line)</small>
          <textarea
            value={preferred}
            onChange={(e) => setPreferred(e.target.value)}
            rows={6}
            placeholder={"Docker\nKubernetes"}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Domain <small>(its managers screen the shortlisted resumes)</small>
          <select value={domainId} onChange={(e) => setDomainId(e.target.value)} required disabled={!domains}>
            <option value="">{domains ? "Choose a domain…" : "Loading domains…"}</option>
            {domains?.map((d) => (
              <option key={d.domain_id} value={d.domain_id}>
                {d.name}
              </option>
            ))}
          </select>
          {domains?.length === 0 && (
            <small>
              There are no domains yet. <Link to="/domains">Add one</Link> first.
            </small>
          )}
        </label>
        <label>
          Minimum score to shortlist <small>(0-100)</small>
          <input
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            required
          />
          <small>Recruiters can only send resumes scoring at least this to the domain manager.</small>
        </label>
      </div>
      <label className="narrow">
        Minimum experience (years)
        <input
          type="number"
          min={0}
          max={60}
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder="Auto-detected from required skills"
        />
      </label>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
