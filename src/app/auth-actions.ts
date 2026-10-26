"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";

export type AuthState = { error?: string };

const Credentials = z.object({
  email: z.email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  name: z.string().optional(),
});

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = Credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password, name } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "Un compte existe déjà avec cet email." };

  const workspace = await db.workspace.create({
    data: {
      name: name ? `Espace de ${name}` : "Mon espace",
      ledger: { create: { delta: 300, reason: "Crédits offerts à l'inscription" } },
    },
  });
  const user = await db.user.create({
    data: { email, name, passwordHash: await hashPassword(password), workspaceId: workspace.id },
  });
  await createSession(user.id);
  redirect("/app");
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = Credentials.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Email ou mot de passe incorrect." };
  }
  await createSession(user.id);
  redirect("/app");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
