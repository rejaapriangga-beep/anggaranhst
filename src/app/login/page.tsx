"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email atau password salah");
    } else {
      router.push("/reports");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F4F5FA]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-3xl shadow-lg shadow-slate-200/60 p-8 space-y-5"
      >
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#FF8A5C] flex items-center justify-center text-white font-semibold text-lg mx-auto mb-3">
            A
          </div>
          <h1 className="text-xl font-semibold text-slate-800">AnggaranHC</h1>
          <p className="text-sm text-slate-500 mt-1">Monitoring Penyerapan Anggaran</p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#6C5CE7] hover:bg-[#5842d6] disabled:opacity-60 text-white text-sm font-medium rounded-xl py-2.5 transition"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
