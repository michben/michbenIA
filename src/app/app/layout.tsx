import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";
import { PLANS } from "@/lib/credits";
import type { Plan } from "@/lib/types";

const NAV = [
  { href: "/app", label: "Vue d'ensemble" },
  { href: "/app/avatars", label: "Avatars" },
  { href: "/app/studio", label: "Studio" },
  { href: "/app/videos", label: "Vidéos" },
  { href: "/app/calendar", label: "Planning" },
  { href: "/app/accounts", label: "Comptes" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/settings", label: "Réglages & API" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const plan = PLANS[user.workspace.plan as Plan] ?? PLANS.FREE;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r" style={{ borderColor: "var(--border)" }}>
        <Link href="/app" className="mb-6 block text-xl font-black tracking-tight">michbenia</Link>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-white/5">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="card mt-6 hidden p-4 md:block">
          <p className="label">Crédits</p>
          <p className="text-2xl font-black">{user.workspace.credits.toLocaleString("fr-FR")}</p>
          <p className="muted text-xs">Plan {plan.label}</p>
        </div>
        <form action={logout} className="mt-4 hidden md:block">
          <button className="muted text-xs underline">Se déconnecter ({user.email})</button>
        </form>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
