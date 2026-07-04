"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStaffUser,
  updateUserRole,
  setAgentParent,
} from "@/app/admin/user-actions";
import { ASSIGNABLE_ROLES, type StaffUser } from "@/lib/admin/users-shared";

const INPUT_CLS =
  "w-full rounded-md border border-border-warm bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand-red";

export function UserManager({
  users,
  live,
}: {
  users: StaffUser[];
  live: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "staff",
    agent_code: "",
    parent_agent_id: "",
  });
  const [notice, setNotice] = useState<string | null>(null);

  // Existing agents = candidate master agents.
  const agents = users.filter((u) => u.role === "agent");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createStaffUser(form);
      if (res.ok) {
        setNotice(`Account created for ${form.full_name}.`);
        setForm({ full_name: "", email: "", password: "", role: "staff", agent_code: "", parent_agent_id: "" });
        router.refresh();
      } else if (res.error === "dev") {
        setNotice("Supabase isn't connected yet — accounts can be created once live.");
      } else {
        setNotice("Couldn't create the account. Check the email isn't in use.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Create */}
      <form
        onSubmit={submit}
        className="rounded-card border border-border-warm bg-paper p-5"
      >
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
          New account
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className={INPUT_CLS}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={INPUT_CLS}
          />
          <input
            required
            type="password"
            minLength={8}
            placeholder="Temporary password (min 8)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={INPUT_CLS}
          />
          <div className="flex gap-3">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={INPUT_CLS}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {form.role === "agent" && (
              <input
                required
                placeholder="Agent code"
                value={form.agent_code}
                onChange={(e) =>
                  setForm({ ...form, agent_code: e.target.value.toUpperCase() })
                }
                className={INPUT_CLS}
              />
            )}
          </div>
          {form.role === "agent" && (
            <select
              value={form.parent_agent_id}
              onChange={(e) =>
                setForm({ ...form, parent_agent_id: e.target.value })
              }
              className={INPUT_CLS}
              title="Master agent this agent is handled under"
            >
              <option value="">No master agent (top-level)</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  Under {a.full_name}
                  {a.agent_code ? ` (${a.agent_code})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand-red px-5 py-2 text-sm font-medium text-cream transition-colors hover:bg-brand-red-soft disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create account"}
          </button>
          {notice && <p className="text-sm text-ink-soft">{notice}</p>}
          {!live && !notice && (
            <p className="text-xs text-ink-muted">
              Preview mode — creation activates once Supabase is connected.
            </p>
          )}
        </div>
      </form>

      {/* List */}
      <div className="overflow-x-auto rounded-card border border-border-warm">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border-warm bg-cream-50 text-left text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Agent code</th>
              <th className="px-4 py-2.5 font-medium">Master agent</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border-warm/60 bg-paper last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{u.full_name}</td>
                <td className="px-4 py-3 text-xs text-ink-soft">{u.email}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                  {u.agent_code ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {u.role === "agent" ? (
                    <select
                      value={u.parent_agent_id ?? ""}
                      disabled={pending}
                      onChange={(e) =>
                        start(async () => {
                          await setAgentParent(u.id, e.target.value || null);
                          router.refresh();
                        })
                      }
                      className="rounded-md border border-border-warm bg-paper px-2 py-1 text-xs text-ink outline-none"
                    >
                      <option value="">— none —</option>
                      {agents
                        .filter((a) => a.id !== u.id)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.full_name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={pending}
                    onChange={(e) =>
                      start(async () => {
                        await updateUserRole(u.id, e.target.value, u.agent_code ?? undefined);
                        router.refresh();
                      })
                    }
                    className="rounded-md border border-border-warm bg-paper px-2 py-1 text-xs text-ink outline-none"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
