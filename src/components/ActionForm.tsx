"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/app/actions";

/** Formulaire branché sur une server action, avec affichage de l'erreur ou du succès. */
export function ActionForm({
  action,
  children,
  submitLabel,
  className = "space-y-4",
  showOkAsCode = false,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  showOkAsCode?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.ok &&
        (showOkAsCode ? (
          <p className="text-sm">
            Copie cette clé maintenant, elle ne sera plus affichée :
            <code className="mt-1 block break-all rounded-lg bg-black/40 p-2">{state.ok}</code>
          </p>
        ) : (
          <p className="text-sm text-emerald-400">{state.ok}</p>
        ))}
      <button className="btn" disabled={pending}>
        {pending ? "En cours…" : submitLabel}
      </button>
    </form>
  );
}
