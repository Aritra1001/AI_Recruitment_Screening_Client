export function SkillList({ skills, max }: { skills: string[] | null; max?: number }) {
  if (!skills?.length) return <span className="muted">—</span>;
  const shown = max ? skills.slice(0, max) : skills;
  return (
    <span className="chips">
      {shown.map((s) => (
        <span key={s} className="chip">
          {s}
        </span>
      ))}
      {max && skills.length > max && <span className="muted">+{skills.length - max} more</span>}
    </span>
  );
}
