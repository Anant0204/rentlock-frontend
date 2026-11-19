import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, Building2, Eye, EyeOff,
  Crown, Users, KeyRound, ChevronRight,
  TrendingUp, Wifi, Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';
import { getOwners, getManagers } from '../../data/mockExtra';
import { getTenants } from '../../data/mockTenants';
import toast from 'react-hot-toast';

/* ─────────────────────── ROLE CONFIG (4 ACCOUNTS) ─────────────────────── */
const ROLES = [
  { key: 'admin',   label: 'Admin',   icon: Shield,   gradient: 'from-violet-500 to-indigo-600', ring: 'ring-violet-400/30', credential: { email: 'admin@rentlock.com', password: 'demo123' } },
  { key: 'owner',   label: 'Owner',   icon: Crown,    gradient: 'from-emerald-500 to-teal-500',  ring: 'ring-emerald-400/30',credential: { email: 'owner@rentlock.com', password: 'demo123' } },
  { key: 'manager', label: 'Manager', icon: Users,    gradient: 'from-blue-500 to-cyan-500',     ring: 'ring-blue-400/30',   credential: { email: 'sarah.jenkins@rentlock.com', password: 'demo123' } },
  { key: 'tenant',  label: 'Tenant',  icon: KeyRound, gradient: 'from-rose-500 to-pink-500',     ring: 'ring-rose-400/30',   credential: { email: 'rebecca@rentlock.com', password: 'demo123' } },
];

/* ─────────────────────── PSEUDO-RANDOM HELPER ─────────────────────── */
const pseudoRand = (seed) => {
  const x = Math.sin(seed * 9999 + 1) * 10000;
  return x - Math.floor(x);
};

/* ─────────────── SKYLINE BUILDING (OPTIMIZED GPU CSS) ─────────────── */
function SkylineBuilding({ left, width, height, hue, floors, cols, zIndex = 1 }) {
  const windowData = useMemo(() => {
    return Array.from({ length: floors * cols }, (_, idx) => {
      const r1 = pseudoRand(idx * 7 + (left || 1));
      const r2 = pseudoRand(idx * 13 + (height || 1));
      const r5 = pseudoRand(idx * 29 + (floors || 1));
      return {
        lit: r1 > 0.25,
        brightness: 0.35 + r5 * 0.45,
        extraHue: r2 > 0.5 ? 35 + pseudoRand(idx * 31) * 25 : hue,
      };
    });
  }, [floors, cols, left, height, hue]);

  return (
    <div
      className="absolute bottom-0"
      style={{ left: `${left}%`, zIndex, width: `${width}px` }}
    >
      {/* Rooftop accent */}
      <div
        className="mx-auto rounded-t-sm"
        style={{
          width: '60%',
          height: '4px',
          background: `linear-gradient(90deg, transparent, hsla(${hue}, 70%, 60%, 0.4), transparent)`,
        }}
      />
      {/* Antenna */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div
          className="w-1.5 h-1.5 rounded-full mb-0.5 animate-pulse"
          style={{ background: `hsla(0, 80%, 55%, 0.9)`, boxShadow: `0 0 8px hsla(0, 80%, 55%, 0.6)` }}
        />
        <div className="w-px h-4" style={{ background: `hsla(${hue}, 30%, 50%, 0.25)` }} />
      </div>

      {/* Building body */}
      <div
        className="relative overflow-hidden rounded-t-md"
        style={{
          width: '100%',
          height: `${height}px`,
          background: `linear-gradient(180deg, hsla(${hue}, 25%, 16%, 0.95) 0%, hsla(${hue}, 20%, 8%, 0.98) 100%)`,
          borderLeft: `1px solid hsla(${hue}, 40%, 45%, 0.12)`,
          borderRight: `1px solid hsla(${hue}, 40%, 30%, 0.08)`,
          borderTop: `1px solid hsla(${hue}, 40%, 50%, 0.15)`,
          boxShadow: `0 -12px 36px hsla(${hue}, 60%, 40%, 0.08)`,
        }}
      >
        {/* Edge highlight */}
        <div className="absolute top-0 left-0 bottom-0 w-px" style={{ background: `linear-gradient(180deg, hsla(${hue}, 50%, 65%, 0.2), transparent 60%)` }} />

        {/* Horizontal floor lines */}
        {Array.from({ length: floors }).map((_, i) => (
          <div
            key={`fl-${i}`}
            className="absolute left-0 right-0 h-px"
            style={{
              top: `${((i + 1) / (floors + 1)) * 100}%`,
              background: `hsla(${hue}, 20%, 40%, 0.06)`,
            }}
          />
        ))}

        {/* Windows - Pure CSS lightweight grid without JS animation thrash */}
        <div
          className="absolute inset-[5px] grid"
          style={{
            gridTemplateRows: `repeat(${floors}, 1fr)`,
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '3px',
          }}
        >
          {windowData.map((w, j) => (
            <div
              key={j}
              className="rounded-[1px]"
              style={{
                background: w.lit
                  ? `hsla(${w.extraHue}, 55%, 65%, ${w.brightness})`
                  : `hsla(${hue}, 15%, 12%, 0.4)`,
                boxShadow: w.lit ? `0 0 5px hsla(${w.extraHue}, 50%, 55%, 0.15)` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Ground glow */}
      <div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full blur-xl pointer-events-none"
        style={{ width: `${width * 2}px`, height: '16px', background: `hsla(${hue}, 50%, 45%, 0.07)` }}
      />
    </div>
  );
}

/* ─────────────── FULL SKYLINE ─────────────── */
function CityScape() {
  const buildings = [
    // Far background layer
    { left: 3,  width: 54, height: 340, hue: 235, floors: 18, cols: 3, zIndex: 1 },
    { left: 14, width: 48, height: 260, hue: 250, floors: 14, cols: 3, zIndex: 1 },
    { left: 27, width: 42, height: 200, hue: 260, floors: 11, cols: 2, zIndex: 1 },
    { left: 54, width: 50, height: 290, hue: 242, floors: 16, cols: 3, zIndex: 1 },
    { left: 70, width: 44, height: 230, hue: 255, floors: 12, cols: 2, zIndex: 1 },
    { left: 84, width: 56, height: 310, hue: 238, floors: 17, cols: 3, zIndex: 1 },
    // Mid layer
    { left: 8,  width: 62, height: 280, hue: 228, floors: 15, cols: 3, zIndex: 2 },
    { left: 22, width: 70, height: 360, hue: 245, floors: 20, cols: 4, zIndex: 2 },
    { left: 40, width: 58, height: 300, hue: 252, floors: 16, cols: 3, zIndex: 2 },
    { left: 60, width: 66, height: 380, hue: 240, floors: 21, cols: 4, zIndex: 2 },
    { left: 78, width: 52, height: 250, hue: 248, floors: 13, cols: 3, zIndex: 2 },
    // Front layer
    { left: 1,  width: 72, height: 200, hue: 225, floors: 11, cols: 4, zIndex: 3 },
    { left: 18, width: 60, height: 160, hue: 233, floors: 9,  cols: 3, zIndex: 3 },
    { left: 35, width: 80, height: 240, hue: 248, floors: 13, cols: 4, zIndex: 3 },
    { left: 55, width: 55, height: 180, hue: 258, floors: 10, cols: 3, zIndex: 3 },
    { left: 72, width: 68, height: 220, hue: 230, floors: 12, cols: 4, zIndex: 3 },
    { left: 90, width: 58, height: 170, hue: 243, floors: 9,  cols: 3, zIndex: 3 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Horizon glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[45%]"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, hsla(245, 60%, 12%, 0.5) 40%, hsla(250, 70%, 18%, 0.4) 70%, hsla(255, 50%, 25%, 0.15) 100%)',
        }}
      />
      <div className="absolute inset-0">
        {buildings.map((b, i) => (
          <SkylineBuilding key={i} {...b} />
        ))}
      </div>
      {/* Ground line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 5%, hsla(250, 50%, 50%, 0.15) 30%, hsla(250, 50%, 50%, 0.2) 50%, hsla(250, 50%, 50%, 0.15) 70%, transparent 95%)' }}
      />
      {/* Ground reflection */}
      <div
        className="absolute bottom-0 left-0 right-0 h-12"
        style={{ background: 'linear-gradient(180deg, hsla(250, 40%, 15%, 0.3) 0%, transparent 100%)' }}
      />
    </div>
  );
}

/* ─────────────── FLOATING GLASS CARD ─────────────── */
function GlassCard({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`backdrop-blur-xl bg-white/[0.06] border border-white/[0.1] rounded-2xl p-4 shadow-xl shadow-black/10 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* ────────────── AMBIENT PARTICLES (LIGHTWEIGHT) ────────────── */
const STATIC_PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const p1 = pseudoRand(i * 11 + 1);
  const p2 = pseudoRand(i * 17 + 2);
  const p3 = pseudoRand(i * 23 + 3);
  return {
    id: i,
    x: p1 * 100,
    y: p2 * 70,
    size: p3 * 2.5 + 1,
    dur: p1 * 5 + 4,
    delay: p2 * 3,
    hue: 220 + p3 * 40,
  };
});

function AmbientParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {STATIC_PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `hsla(${p.hue}, 70%, 75%, 0.35)`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────── SMOOTH COUNTER ─────────── */
function Counter({ target, suffix = '' }) {
  const [val, setVal] = useState(target);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const dur = 800;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.floor(eased * target));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return <>{val.toLocaleString()}{suffix}</>;
}

/* ══════════════════════ MAIN LOGIN ══════════════════════ */
export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: 'admin@rentlock.com', password: 'demo123', role: 'admin' });
  const [errors, setErrors] = useState({});
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const customOwners = useMemo(() => {
    try {
      return getOwners().filter((o) => !o.archived);
    } catch {
      return [];
    }
  }, []);

  const customManagers = useMemo(() => {
    try {
      return getManagers().filter((m) => !m.archived);
    } catch {
      return [];
    }
  }, []);

  const customTenants = useMemo(() => {
    try {
      return getTenants().filter((t) => t.status !== 'Archived');
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    // Only attempt sync if a valid authenticated session exists; never on unauthenticated login page
    const token = localStorage.getItem('pm_token');
    if (!token) return;

    // Proactively sync any custom managers or owners created in admin portal to backend
    customManagers.forEach((m) => {
      if (m.email) {
        apiClient.post('/managers', {
          name: m.name,
          email: m.email,
          phone: m.phone,
          password: m.password || 'demo123',
        }).catch(() => {});
      }
    });
    customOwners.forEach((o) => {
      if (o.email) {
        apiClient.post('/owners', {
          name: o.name,
          email: o.email,
          phone: o.phone,
          password: o.password || 'demo123',
        }).catch(() => {});
      }
    });
  }, [customManagers, customOwners]);

  const selectRole = (role) => {
    setForm({
      email: role.credential.email,
      password: role.credential.password,
      role: role.key,
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    if (!form.password) errs.password = 'Password is required';

    const lowerEmail = form.email.trim().toLowerCase();

    // 1. Strict check if account is deactivated / archived
    const isDeactivated = (u) => {
      if (!u) return false;
      return (
        u.archived === true ||
        u.status === 'Archived' ||
        u.status === 'Inactive' ||
        u.status === 'Deactivated' ||
        u.isActive === false
      );
    };

    const allManagers = getManagers();
    const allOwners = getOwners();
    const allTenants = getTenants();

    const deactUser =
      allManagers.find((m) => (m.email || '').toLowerCase() === lowerEmail && isDeactivated(m)) ||
      allOwners.find((o) => (o.email || '').toLowerCase() === lowerEmail && isDeactivated(o)) ||
      allTenants.find((t) => (t.email || '').toLowerCase() === lowerEmail && isDeactivated(t));

    if (deactUser) {
      const deactMsg = `Account Deactivated: ${deactUser.name || lowerEmail} is deactivated / archived. Login is disabled.`;
      toast.error(deactMsg, { duration: 5000 });
      setErrors({ email: 'This account has been deactivated. Please contact the administrator.' });
      return;
    }

    // Auto-resolve role based on email if needed
    let role = form.role;
    if (customManagers.some((m) => (m.email || '').toLowerCase() === lowerEmail)) {
      role = 'manager';
    } else if (customOwners.some((o) => (o.email || '').toLowerCase() === lowerEmail)) {
      role = 'owner';
    } else if (customTenants.some((t) => (t.email || '').toLowerCase() === lowerEmail)) {
      role = 'tenant';
    }

    if (!role) errs.role = 'Select a role';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    try {
      await login(form.email, form.password, role);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const errMsg = err?.message || 'Invalid credentials';
      toast.error(errMsg, { duration: 5000 });
      setErrors({ password: errMsg });
    }
  };

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } };
  const fadeUp = { hidden: { y: 14, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } } };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-[#050816]">

      {/* ═══════ BACKGROUND ═══════ */}
      <div className="fixed inset-0 -z-10 bg-[#050816] pointer-events-none">
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-[0.14] blur-[120px]"
          style={{ top: '-25%', left: '-15%', background: 'radial-gradient(circle, #4338ca, transparent 70%)' }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-[0.10] blur-[100px]"
          style={{ bottom: '-20%', right: '-10%', background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      {/* ═══════════════ LEFT — HERO WITH SKYLINE ═══════════════ */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative flex-col p-8 xl:p-12 overflow-hidden">
        <AmbientParticles />
        <CityScape />

        {/* ─── Top Branding ─── */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative z-20 flex items-center gap-4"
        >
          {/* Advanced Icon */}
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-fuchsia-500 p-[1px] shadow-2xl shadow-indigo-500/25 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="w-full h-full rounded-2xl bg-[#0a0f25] backdrop-blur-xl flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
              <Building2 className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
            </div>
          </div>
          {/* Advanced Text */}
          <div className="flex flex-col justify-center">
            <h1 className="text-[26px] leading-none font-black tracking-tighter flex items-center drop-shadow-md">
              <span className="text-white">Rent</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Lock</span>
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-8 h-[2px] rounded-full bg-gradient-to-r from-indigo-500 to-transparent" />
              <p className="text-[10px] text-white/50 uppercase tracking-[0.35em] font-extrabold">US Portfolio OS</p>
            </div>
          </div>
        </motion.div>

        {/* ─── Center Content ─── */}
        <div className="relative z-20 flex-1 flex flex-col justify-start pt-4 xl:pt-10 pointer-events-none">
          <div className="flex flex-col xl:flex-row justify-between items-start gap-8 mt-4">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex-1"
            >
              <motion.h2 
                className="text-4xl xl:text-[3.5rem] font-extrabold leading-[1.05] tracking-tight bg-clip-text text-transparent pb-1"
                style={{
                  backgroundImage: 'linear-gradient(to right, #818cf8, #c084fc, #2dd4bf, #818cf8)',
                  backgroundSize: '300% 100%'
                }}
                animate={{ backgroundPosition: ['0% 0%', '100% 0%'] }}
                transition={{ duration: 7, ease: 'linear', repeat: Infinity }}
              >
                Smart Property
                <br />
                Management
              </motion.h2>
              <p className="text-base text-white/60 mt-5 leading-relaxed max-w-2xl font-medium">
                The all-in-one platform to manage your real estate portfolio — residential, commercial, societies, and mixed-use properties.
              </p>
            </motion.div>

            {/* ─── Floating Glass Info Cards ─── */}
            <div className="grid grid-cols-2 gap-3 shrink-0 xl:-mr-12">
              <GlassCard delay={1.0} y={-6} className="min-w-[160px]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white leading-none"><Counter target={520} suffix="+" /></p>
                    <p className="text-[10px] text-white/30 mt-0.5">Properties Managed</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard delay={1.15} y={-8} className="min-w-[160px]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-violet-300" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white leading-none">$<Counter target={485} />K</p>
                    <p className="text-[10px] text-white/30 mt-0.5">Rent Billed YTD</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard delay={1.3} y={-5} className="min-w-[160px]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white leading-none"><Counter target={4850} suffix="+" /></p>
                    <p className="text-[10px] text-white/30 mt-0.5">Active Tenants</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard delay={1.45} y={-7} className="min-w-[160px]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <Wifi className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white leading-none"><Counter target={99} />.9%</p>
                    <p className="text-[10px] text-white/30 mt-0.5">Platform Uptime</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>

        {/* ─── Bottom decorative line ─── */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, delay: 1.8 }}
          className="relative z-20 h-px origin-left"
          style={{ background: 'linear-gradient(90deg, hsla(250, 50%, 50%, 0.2), transparent 80%)' }}
        />
      </div>

      {/* ═══════════════ RIGHT — LOGIN PANEL ═══════════════ */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-10 relative z-10">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-[420px]"
        >
          {/* Glass card */}
          <div className="relative backdrop-blur-2xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-7 sm:p-8 shadow-2xl shadow-black/30 overflow-hidden">
            {/* Top edge shine */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent" />
            {/* Corner glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

            <motion.div variants={stagger} initial="hidden" animate="visible">
              {/* Mobile brand */}
              <motion.div variants={fadeUp} className="lg:hidden flex items-center gap-3.5 mb-8">
                <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-fuchsia-500 p-[1px] shadow-lg shadow-indigo-500/20">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 blur-md opacity-30" />
                  <div className="w-full h-full rounded-xl bg-[#0a0f25] flex items-center justify-center relative overflow-hidden">
                    <Building2 className="w-5 h-5 text-white drop-shadow-md" />
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-0.5">
                  <h1 className="text-[22px] leading-none font-black tracking-tighter flex items-center">
                    <span className="text-white">Rent</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Lock</span>
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-5 h-[2px] rounded-full bg-gradient-to-r from-indigo-500 to-transparent" />
                    <p className="text-[9px] text-white/50 uppercase tracking-[0.3em] font-extrabold">US Portfolio OS</p>
                  </div>
                </div>
              </motion.div>

              {/* Header */}
              <motion.div variants={fadeUp} className="mb-7">
                <h2 className="text-xl font-bold text-white tracking-tight">Sign in to your account</h2>
                <p className="text-xs text-white/30 mt-1.5">Select a role below to explore the platform</p>
              </motion.div>

              {/* Role Selector */}
              <motion.div variants={fadeUp} className="mb-6">
                <div className="grid grid-cols-4 gap-1.5">
                  {ROLES.map((role) => {
                    const active = form.role === role.key;
                    const RIcon = role.icon;
                    return (
                      <motion.button
                        key={role.key}
                        type="button"
                        onClick={() => selectRole(role)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border cursor-pointer
                          transition-all duration-300
                          ${active
                            ? `bg-gradient-to-b ${role.gradient} border-transparent shadow-lg ring-1 ${role.ring}`
                            : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]'
                          }
                        `}
                      >
                        <RIcon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-white/30'} transition-colors`} />
                        <span className={`text-[9px] font-medium ${active ? 'text-white' : 'text-white/30'} transition-colors`}>
                          {role.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                {errors.role && <p className="text-[11px] text-red-400 mt-1.5">{errors.role}</p>}
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <motion.div variants={fadeUp}>
                  <label htmlFor="login-email" className="block text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-1.5">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15 group-focus-within:text-indigo-400 transition-colors duration-300" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        const lower = val.trim().toLowerCase();
                        let detectedRole = form.role;
                        if (customManagers.some((m) => (m.email || '').toLowerCase() === lower)) {
                          detectedRole = 'manager';
                        } else if (customOwners.some((o) => (o.email || '').toLowerCase() === lower)) {
                          detectedRole = 'owner';
                        } else if (customTenants.some((t) => (t.email || '').toLowerCase() === lower)) {
                          detectedRole = 'tenant';
                        } else if (lower.includes('manager')) {
                          detectedRole = 'manager';
                        } else if (lower.includes('owner')) {
                          detectedRole = 'owner';
                        } else if (lower.includes('tenant')) {
                          detectedRole = 'tenant';
                        } else if (lower.includes('admin')) {
                          detectedRole = 'admin';
                        }
                        setForm((prev) => ({ ...prev, email: val, role: detectedRole }));
                        setErrors({});
                      }}
                      placeholder="your@email.com"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/15 outline-none
                        focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 focus:bg-white/[0.06] transition-all duration-300"
                    />
                  </div>
                  {errors.email && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-red-400 mt-1">{errors.email}</motion.p>}
                </motion.div>

                {/* Password */}
                <motion.div variants={fadeUp}>
                  <label htmlFor="login-password" className="block text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-1.5">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15 group-focus-within:text-indigo-400 transition-colors duration-300" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/15 outline-none
                        focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 focus:bg-white/[0.06] transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/15 hover:text-white/40 transition-colors cursor-pointer"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={showPassword ? 'off' : 'on'}
                          initial={{ rotateX: -90, opacity: 0 }}
                          animate={{ rotateX: 0, opacity: 1 }}
                          exit={{ rotateX: 90, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </motion.div>
                      </AnimatePresence>
                    </button>
                  </div>
                  {errors.password && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-red-400 mt-1">{errors.password}</motion.p>}
                </motion.div>

                {/* Remember me */}
                <motion.div variants={fadeUp} className="flex items-center">
                  <label htmlFor="remember" className="flex items-center gap-2 cursor-pointer group">
                    <input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="sr-only peer" />
                    <div className="w-3.5 h-3.5 rounded border border-white/12 bg-white/[0.04] peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-all flex items-center justify-center">
                      {remember && (
                        <svg className="w-2 h-2 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[11px] text-white/25 group-hover:text-white/40 transition-colors">Remember me</span>
                  </label>
                </motion.div>

                {/* Submit */}
                <motion.div variants={fadeUp} className="pt-1">
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-full py-3 rounded-xl font-semibold text-sm text-white cursor-pointer
                      bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600
                      shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-shadow duration-300 overflow-hidden group"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Signing in…
                        </>
                      ) : (
                        <>Sign In <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
                      )}
                    </span>
                  </motion.button>
                </motion.div>

                {/* Subtle bottom badge */}
                <motion.div variants={fadeUp} className="flex items-center justify-center gap-1.5 pt-2">
                  <Shield className="w-3 h-3 text-white/10" />
                  <span className="text-[10px] text-white/15">Secured & Encrypted</span>
                </motion.div>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
