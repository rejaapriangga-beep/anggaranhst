"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type ActiveUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  lastActiveAt: string;
};

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", EDITOR: "Editor", VIEWER: "Viewer" };
const ROLE_COLOR: Record<string, string> = { ADMIN: "#6C5CE7", EDITOR: "#0d9488", VIEWER: "#64748b" };

function timeAgo(iso: string) {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 10) return "baru saja";
  if (diffSec < 60) return `${diffSec} detik lalu`;
  return `${Math.floor(diffSec / 60)} menit lalu`;
}

// Bottom bar "user sedang aktif" — heartbeat tiap 30 detik, refresh daftar tiap 15 detik.
// Sama seperti pola di mycareer.hst.web.id, disesuaikan dengan skema role & warna AnggaranHC.
export default function ActiveUsersBar() {
  const { data: authSession } = useSession();
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!authSession) return;

    function sendHeartbeat() {
      fetch("/api/heartbeat", { method: "POST" }).catch(() => {});
    }
    function loadActiveUsers() {
      fetch("/api/active-users")
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          setUsers(data.active_users || []);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }

    sendHeartbeat();
    loadActiveUsers();
    const hbInterval = setInterval(sendHeartbeat, 30000);
    const listInterval = setInterval(loadActiveUsers, 15000);
    return () => {
      clearInterval(hbInterval);
      clearInterval(listInterval);
    };
  }, [authSession]);

  if (!authSession || !loaded) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-2.5 bg-white border-t border-slate-200 px-4 py-1.5 overflow-x-auto whitespace-nowrap shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      <span className="text-[10px] font-semibold text-slate-500 shrink-0">🟢 AKTIF</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {users.length === 0 && <span className="text-[10px] text-slate-500">Tidak ada user aktif.</span>}
        {users.map((u) => {
          const color = ROLE_COLOR[u.role] || "#666";
          const label = ROLE_LABEL[u.role] || u.role;
          const displayName = (u.name || u.email).split(" ")[0];
          return (
            <div
              key={u.id}
              title={`${u.name || u.email} · ${label} · ${timeAgo(u.lastActiveAt)}`}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px]"
              style={{ background: `${color}14`, border: `1px solid ${color}33` }}
            >
              <span className="w-[5px] h-[5px] rounded-full bg-green-500 shrink-0" />
              <span className="font-semibold text-[#1e1b3a]">{displayName}</span>
              <span style={{ color }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
