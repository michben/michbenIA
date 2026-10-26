"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "@/app/auth-actions";

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup";
  action: (state: AuthState, form: FormData) => Promise<AuthState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div className="mx-auto mt-24 max-w-sm card">
      <h1 className="h1 mb-1">{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
      <p className="muted mb-6 text-sm">
        {mode === "login" ? "Content de te revoir." : "300 crédits offerts pour créer tes premiers avatars et vidéos."}
      </p>
      <form action={formAction} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="label">Prénom</label>
            <input name="name" className="input" />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input name="password" type="password" required minLength={8} className="input" />
        </div>
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button className="btn w-full" disabled={pending}>
          {pending ? "…" : mode === "login" ? "Se connecter" : "Commencer gratuitement"}
        </button>
      </form>
      <p className="muted mt-4 text-center text-sm">
        {mode === "login" ? (
          <>Pas encore de compte ? <Link className="underline" href="/signup">Inscription</Link></>
        ) : (
          <>Déjà inscrit ? <Link className="underline" href="/login">Connexion</Link></>
        )}
      </p>
    </div>
  );
}
