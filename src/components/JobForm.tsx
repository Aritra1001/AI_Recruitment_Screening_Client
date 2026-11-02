import { useState, type FormEvent } from "react";
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      required_skills: parseLines(required),
      preferred_skills: parseLines(preferred),
      minimum_experience: experience.trim() === "" ? null : Number(experience),
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
