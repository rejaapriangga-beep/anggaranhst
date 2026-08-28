"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Modal from "@/components/Modal";

const ROLES = ["ADMIN", "EDITOR", "VIEWER"];

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const currentUserId = (session?.user as any)?.id;

  async function load() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setRole("VIEWER");
    setEditingId(null);
    setError("");
  }

  function openAdd() {
    resetForm();
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload: any = { name, email, role };
    if (password) payload.password = password;

    const res = editingId
      ? await fetch(`/api/users/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Terjadi kesalahan");
      return;
    }

    closeModal();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus user ini?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error || "Gagal menghapus");
      return;
    }
    load();
  }

  function startEdit(u: any) {
    setEditingId(u.id);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setPassword("");
    setError("");
    setModalOpen(true);
  }

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-sm text-slate-500">
        Hanya ADMIN yang dapat mengelola user.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Kelola User</h1>
        <button onClick={openAdd} className="bg-[#6C5CE7] hover:bg-[#5842d6] text-white text-sm font-medium rounded-xl px-4 py-2">
          + Tambah User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {u.name} {u.id === currentUserId && <span className="text-xs text-slate-400">(Anda)</span>}
                </td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                    u.role === "EDITOR" ? "bg-[#6C5CE7]/10 text-[#6C5CE7]" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => startEdit(u)} className="text-[#6C5CE7] hover:underline">Ubah</button>
                  {u.id !== currentUserId && (
                    <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:underline">Hapus</button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Belum ada user.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editingId ? "Ubah User" : "Tambah User"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nama</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Password {editingId && <span className="text-slate-400">(kosongkan jika tak diubah)</span>}
            </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={editingId === currentUserId}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="text-sm text-slate-500 px-3 py-2">Batal</button>
            <button type="submit" className="bg-[#6C5CE7] hover:bg-[#5842d6] text-white text-sm font-medium rounded-xl px-4 py-2">
              {editingId ? "Simpan" : "Tambah"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
