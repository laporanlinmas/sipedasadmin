import React, { useState, useEffect } from 'react';
import { useAuth, useTheme } from '../App';
import { User, Lock, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, ShieldAlert, Sun, Moon } from 'lucide-react';

const LOCKOUT_STORAGE_KEY = 'sipedas_auth_lockout';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 1 menit

interface LockoutState {
  failedCount: number;
  lockoutUntil: number;
}

function getLockoutState(): LockoutState {
  try {
    const raw = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!raw) return { failedCount: 0, lockoutUntil: 0 };
    const parsed = JSON.parse(raw);
    const failedCount = typeof parsed.failedCount === 'number' ? parsed.failedCount : 0;
    const lockoutUntil = typeof parsed.lockoutUntil === 'number' ? parsed.lockoutUntil : 0;
    return { failedCount, lockoutUntil };
  } catch {
    return { failedCount: 0, lockoutUntil: 0 };
  }
}

function saveLockoutState(state: LockoutState): void {
  try {
    localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Abaikan kuota
  }
}

function clearLockoutState(): void {
  try {
    localStorage.removeItem(LOCKOUT_STORAGE_KEY);
  } catch {
    // Abaikan
  }
}

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSec, setLockoutSec] = useState<number>(0);

  // Inisialisasi dan sinkronisasi status lockout brute force (persisten di localStorage)
  useEffect(() => {
    // Bersihkan preferensi remember-me warisan lama
    try {
      localStorage.removeItem('sipedas_pref');
    } catch {}

    const checkLockout = () => {
      const state = getLockoutState();
      const now = Date.now();
      if (state.lockoutUntil > now) {
        const remaining = Math.ceil((state.lockoutUntil - now) / 1000);
        setLockoutSec(remaining);
      } else {
        if (state.lockoutUntil > 0) {
          clearLockoutState();
        }
        setLockoutSec(0);
      }
    };

    checkLockout();
    const timer = setInterval(checkLockout, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutSec > 0) return;

    // 1. Sanitasi dan Validasi Input
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    // Anti-Injection: batasi panjang dan pola karakter username (cegah SQL/NoSQL payload)
    const USERNAME_REGEX = /^[a-zA-Z0-9_.@-]{3,50}$/;
    if (!USERNAME_REGEX.test(cleanUsername)) {
      setError('Format username tidak valid. Hanya diperbolehkan huruf, angka, dan karakter . _ - @ (3-50 karakter).');
      return;
    }

    if (password.length > 128) {
      setError('Panjang password melebihi batas yang diizinkan.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(cleanUsername, password);
      if (!res.success) {
        const state = getLockoutState();
        const nextFailed = (state.failedCount || 0) + 1;

        if (nextFailed >= MAX_ATTEMPTS) {
          const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
          saveLockoutState({ failedCount: nextFailed, lockoutUntil });
          setLockoutSec(60);
          setError(null);
        } else {
          saveLockoutState({ failedCount: nextFailed, lockoutUntil: 0 });
          const remaining = MAX_ATTEMPTS - nextFailed;
          setError(`Username atau password salah. Sisa kesempatan: ${remaining} kali.`);
        }
      } else {
        // Berhasil login: bersihkan data lockout
        clearLockoutState();
        setLockoutSec(0);
      }
    } catch (err: any) {
      setError(err?.message || 'Error koneksi ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocked = lockoutSec > 0;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-5 transition-[background-color] duration-300 ease-[ease]">
      {/* Grid background */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(59,130,246,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,.12)_1px,transparent_1px)] bg-[length:48px_48px]"
      />

      {/* Radial glow decoration */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-[10%] -top-[15%] z-0 h-[420px] w-[420px] rounded-full ${
          isDarkMode
            ? 'bg-[radial-gradient(circle,rgba(59,130,246,.15)_0%,transparent_60%)]'
            : 'bg-[radial-gradient(circle,rgba(59,130,246,.22)_0%,transparent_60%)]'
        }`}
      />

      {/* Dark Mode Toggle Desktop */}
      <div className="absolute right-6 top-6 z-[100] hidden sm:block">
        <button
          onClick={toggleDarkMode}
          className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
            isDarkMode
              ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
          title={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="relative z-[2] flex min-h-[520px] w-full max-w-[980px] animate-login-card overflow-hidden rounded-[24px] shadow-[0_32px_80px_rgba(0,0,0,.45),0_4px_20px_rgba(0,0,0,.3)] max-md:flex-col max-md:max-w-[440px] max-md:rounded-[20px]">
        {/* ── Left panel ── */}
        <div className="relative flex flex-col overflow-hidden bg-[linear-gradient(155deg,#1b3b6f_0%,#12294c_45%,#0f172a_100%)] px-10 pb-8 pt-9 flex-[1.15] max-md:flex-none max-md:px-5 max-md:pb-[14px] max-md:pt-4">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[length:32px_32px]"
          />

          <div className="relative z-10 mb-[28px] flex w-full items-center justify-between">
            <div className="relative z-[1] mb-0 flex items-start gap-[14px]">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-[rgba(255,255,255,.3)] bg-[rgba(255,255,255,.15)] p-1.5 backdrop-blur-[4px]">
                <img src="/assets/icon-192.png" alt="SIPEDAS" width={36} height={36} className="h-9 w-9 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
              <div>
                <div className="text-[1.5rem] font-black uppercase leading-none tracking-[.12em] text-[#ffb020] [text-indent:.04em]">SIPEDAS</div>
                <div className="mt-1 text-[.65rem] font-semibold tracking-[.06em] text-[rgba(255,255,255,.75)]">Kabupaten Ponorogo</div>
              </div>
            </div>

            {/* Dark Mode Toggle Mobile */}
            <button
              onClick={toggleDarkMode}
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white shadow-sm transition-all hover:bg-white/25 focus:outline-none sm:hidden"
              title={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
            >
              {isDarkMode ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
          </div>

          <div className="relative z-[1] flex flex-1 flex-col gap-0 max-md:hidden">
            <div className="mb-2 text-[2.15rem] font-black leading-[1.15] tracking-[-.01em] text-white">Dashboard Monitoring</div>
            <div className="mb-5 border-b border-[rgba(255,255,255,.15)] pb-5 text-[.9rem] font-semibold leading-[1.7] text-[rgba(255,255,255,.78)]">Sistem Pelaporan Digital<br />Satgas Linmas</div>
            <div className="flex flex-col gap-2.5 max-md:hidden">
              {['Dashboard analitik program Satgas Linmas', 'Statistik patroli real-time', 'Rekap laporan', 'Manajemen personil Satlinmas', 'Peta Satgas interaktif', 'Tindak lanjuti aduan masyarakat'].map(f => (
                <div key={f} className="flex items-center gap-2.5 text-[.78rem] font-semibold text-[rgba(255,255,255,.82)]">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-[1] mt-7 flex items-center gap-2 border-t border-[rgba(255,255,255,.12)] pt-4 max-md:hidden">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-gold" />
            <span className="flex-1 text-[.65rem] font-bold uppercase tracking-[.07em] text-[rgba(255,255,255,.65)]">Koneksi Terenkripsi & Terlindungi</span>
            <span className="font-mono text-[.6rem] font-bold text-[rgba(255,255,255,.40)]">v5.0.0</span>
          </div>

          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-[280px] w-[280px] rounded-full bg-[rgba(255,255,255,.05)]"
          />
        </div>

        {/* ── Right panel (form) ── */}
        <div className="flex flex-1 flex-col justify-center bg-card px-10 py-9 transition-[background-color] duration-300 ease-[ease] max-md:px-[22px] max-md:pb-7 max-md:pt-5">
          <div className="mb-7">
            <h2 className="mb-1.5 font-display text-[1.6rem] font-black leading-[1.2] tracking-[-0.03em] text-text">Masuk ke Sistem</h2>
            <p className={`text-[.82rem] leading-[1.5] ${isDarkMode ? 'text-[#9ca3af]' : 'text-[#64748b]'}`}>Masukkan kredensial akun administrator Anda untuk melanjutkan.</p>
            <span aria-hidden="true" className="mt-[14px] block h-1 w-10 rounded-full bg-[linear-gradient(90deg,#2BA8A2,#FFD23F)]" />
          </div>

          {/* Banner Peringatan Lockout Brute Force */}
          {isLocked && (
            <div className="mb-5 flex items-start gap-3 rounded-[12px] border border-amber-500/40 bg-amber-500/10 p-3.5 text-[.78rem]" role="alert">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-bold text-amber-600 dark:text-amber-400">Akses Masuk Dikunci Sementara</p>
                <p className="mt-1 leading-relaxed text-amber-700 dark:text-amber-300">
                  Terlalu banyak percobaan gagal ({MAX_ATTEMPTS}/{MAX_ATTEMPTS}). Demi keamanan, silakan tunggu{' '}
                  <strong className="font-mono font-black text-amber-600 dark:text-amber-400 underline">{lockoutSec} detik</strong>{' '}
                  sebelum mencoba kembali.
                </p>
              </div>
            </div>
          )}

          {/* Pesan Kesalahan Biasa */}
          {!isLocked && error && (
            <div className="mb-5 flex items-center gap-2 rounded-[10px] border border-l-4 border-[rgba(239,108,74,.3)] border-l-[#EF6C4A] bg-[#fff0ec] px-3.5 py-2.5 text-[.78rem] font-semibold text-[#b83a1a]" role="alert">
              <AlertCircle className="h-[15px] w-[15px] shrink-0 text-[#EF6C4A]" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-username" className="text-[.65rem] font-extrabold uppercase tracking-[.1em] text-mid">Username</label>
              <div className="relative flex items-center">
                <User className="pointer-events-none absolute left-3 h-[15px] w-[15px] shrink-0 text-[#94a3b8]" />
                <input
                  id="login-username"
                  type="text"
                  maxLength={50}
                  disabled={isLocked || isSubmitting}
                  className={`w-full rounded-[10px] border-[1.5px] px-3.5 py-[11px] pl-[38px] text-[.87rem] text-text transition-all duration-200 outline-none placeholder:text-muted focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)] disabled:cursor-not-allowed disabled:opacity-50 ${
                    isDarkMode
                      ? 'bg-[rgba(255,255,255,.05)] focus:bg-[rgba(255,255,255,.08)] [&:-webkit-autofill]:shadow-[0_0_0_1000px_#181e2c_inset]! [&:-webkit-autofill]:[-webkit-text-fill-color:#f9fafb]!'
                      : 'bg-[#f8fffe] focus:bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_#f8fffe_inset]! [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a]!'
                  }`}
                  placeholder="Masukkan username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-[.65rem] font-extrabold uppercase tracking-[.1em] text-mid">Password</label>
              <div className="relative flex items-center">
                <Lock className="pointer-events-none absolute left-3 h-[15px] w-[15px] shrink-0 text-[#94a3b8]" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  maxLength={128}
                  disabled={isLocked || isSubmitting}
                  className={`w-full rounded-[10px] border-[1.5px] px-3.5 py-[11px] pl-[38px] text-[.87rem] text-text transition-all duration-200 outline-none placeholder:text-muted focus:border-blue focus:shadow-[0_0_0_3px_var(--bluelo)] disabled:cursor-not-allowed disabled:opacity-50 ${
                    isDarkMode
                      ? 'bg-[rgba(255,255,255,.05)] focus:bg-[rgba(255,255,255,.08)] [&:-webkit-autofill]:shadow-[0_0_0_1000px_#181e2c_inset]! [&:-webkit-autofill]:[-webkit-text-fill-color:#f9fafb]!'
                      : 'bg-[#f8fffe] focus:bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_#f8fffe_inset]! [&:-webkit-autofill]:[-webkit-text-fill-color:#0f172a]!'
                  }`}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  disabled={isLocked}
                  className="absolute right-2.5 cursor-pointer border-none bg-transparent p-1 text-muted transition-colors duration-150 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="relative mt-2 flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border-none bg-[linear-gradient(135deg,#FFD23F_0%,#E6B800_100%)] px-5 py-[13px] text-[.9rem] font-extrabold tracking-[.02em] text-[#1a0f00] shadow-[0_2px_8px_rgba(0,0,0,.15)] transition-all duration-[220ms] [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] enabled:active:scale-[.97] enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_4px_14px_rgba(0,0,0,.18)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLocked || isSubmitting}
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[999px] bg-[rgba(255,255,255,.18)]" />
              {isLocked ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-[#1a0f00]" />
                  <span>Akses Terkunci ({lockoutSec}s)</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#1a0f00]" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                'Masuk ke Sistem'
              )}
            </button>
          </form>

          <p className={`mt-6 text-center text-[.62rem] leading-[1.5] ${isDarkMode ? 'text-[#9ca3af]' : 'text-[#64748b]'}`}>&copy; 2026 Bidang SDA & Linmas Satpol PP Kabupaten Ponorogo</p>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[15%] -left-[10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(255,210,63,.10)_0%,transparent_65%)]"
      />
    </main>
  );
};

export default Login;
