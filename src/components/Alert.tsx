import type { ReactNode } from "react";

interface Props {
  kind?: "error" | "success" | "info";
  children: ReactNode;
  onClose?: () => void;
}

export function Alert({ kind = "info", children, onClose }: Props) {
  if (!children) return null;
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
