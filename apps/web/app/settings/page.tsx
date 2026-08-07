"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useTheme } from "next-themes";
import {
  Camera,
  Sun,
  Moon,
  Monitor,
  Wallet,
  LogOut,
  Bell,
  BellOff,
  Globe,
  Shield,
  Check,
  Copy,
  User,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  DollarSign,
  ChevronRight,
} from "lucide-react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const AVATAR_KEY = "aijobs-profile-avatar";
const SETTINGS_KEY = "aijobs_settings";

interface AppSettings {
  currency: "USD" | "EUR" | "CELO";
  notifications: boolean;
  autoConnect: boolean;
  refreshInterval: number; // seconds
  hideBalances: boolean;
  language: "en" | "fr";
}

const DEFAULTS: AppSettings = {
  currency: "USD",
  notifications: true,
  autoConnect: true,
  refreshInterval: 30,
  hideBalances: false,
  language: "en",
};

function getAvatar(addr: string): string | null {
  try {
    const data = JSON.parse(localStorage.getItem(AVATAR_KEY) || "{}");
    return data[addr] || null;
  } catch { return null; }
}
function saveAvatar(addr: string, dataUrl: string) {
  try {
    const data = JSON.parse(localStorage.getItem(AVATAR_KEY) || "{}");
    data[addr] = dataUrl;
    localStorage.setItem(AVATAR_KEY, JSON.stringify(data));
  } catch {}
}

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}
function saveSettings(s: AppSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (address) setAvatar(getAvatar(address));
  }, [address]);
  useEffect(() => { setSettings(loadSettings()); }, []);

  const update = (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    saveSettings(next);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const url = ev.target?.result as string;
      setAvatar(url);
      saveAvatar(address, url);
    };
    r.readAsDataURL(file);
    e.target.value = "";
  };

  const copyAddr = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return null;

  const themes = [
    { key: "light", label: "Light", icon: Sun },
    { key: "dark", label: "Dark", icon: Moon },
    { key: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 grid-pattern opacity-30 dark:opacity-20" />
      <Header />

      <section className="mx-auto w-full max-w-2xl px-4 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-gradient">
          Settings
        </h1>

        {/* Profile */}
        <div className="mt-8 space-y-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profile</p>
          <div className="glass rounded-2xl divide-y divide-border/50">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Profile Picture</span>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                className="group relative h-10 w-10 overflow-hidden rounded-full border-2 border-border bg-muted transition hover:border-primary/50"
              >
                {isConnected && avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : isConnected ? (
                  <span className="flex h-full w-full items-center justify-center text-sm font-bold text-muted-foreground">
                    {address!.slice(2, 4).toUpperCase()}
                  </span>
                ) : (
                  <Camera className="mx-auto h-4 w-4 text-muted-foreground" />
                )}
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Camera className="h-4 w-4 text-white" />
                </span>
              </button>
            </div>

            {isConnected && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Wallet</span>
                </div>
                <button onClick={copyAddr} className="flex items-center gap-1 font-mono text-xs text-muted-foreground transition hover:text-foreground">
                  {address!.slice(0, 6)}…{address!.slice(-4)}
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Appearance */}
        <div className="mt-8 space-y-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Appearance</p>
          <div className="glass rounded-2xl divide-y divide-border/50">
            {themes.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className="flex w-full items-center justify-between p-4 transition hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                {theme === key && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Display */}
        <div className="mt-8 space-y-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Display</p>
          <div className="glass rounded-2xl divide-y divide-border/50">
            {/* Currency */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Currency</span>
              </div>
              <div className="flex gap-1">
                {(["USD", "EUR", "CELO"] as const).map((cur) => (
                  <button
                    key={cur}
                    onClick={() => update({ currency: cur })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      settings.currency === cur
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            {/* Hide Balances */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Hide Balances</span>
              </div>
              <button
                onClick={() => update({ hideBalances: !settings.hideBalances })}
                className={`rounded-full p-1.5 transition ${
                  settings.hideBalances ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {settings.hideBalances ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Refresh Interval */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Data Refresh</span>
              </div>
              <div className="flex gap-1">
                {([15, 30, 60] as const).map((sec) => (
                  <button
                    key={sec}
                    onClick={() => update({ refreshInterval: sec })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      settings.refreshInterval === sec
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Behavior */}
        <div className="mt-8 space-y-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Behavior</p>
          <div className="glass rounded-2xl divide-y divide-border/50">
            {/* Notifications */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Bounty Notifications</span>
              </div>
              <button
                onClick={() => update({ notifications: !settings.notifications })}
                className={`rounded-full p-1.5 transition ${
                  settings.notifications ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                }`}
              >
                {settings.notifications ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </button>
            </div>

            {/* Auto-connect */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Auto-connect Wallet</span>
              </div>
              <button
                onClick={() => update({ autoConnect: !settings.autoConnect })}
                className={`rounded-full p-1.5 transition ${
                  settings.autoConnect ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <Zap className="h-5 w-5" />
              </button>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Language</span>
              </div>
              <div className="flex gap-1">
                {([
                  { value: "en", label: "EN" },
                  { value: "fr", label: "FR" },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => update({ language: value })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      settings.language === value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="mt-8 space-y-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Security</p>
          <div className="glass rounded-2xl divide-y divide-border/50">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Agent Identity</span>
              </div>
              <span className="text-xs text-muted-foreground">ERC-8004 · Not claimed</span>
            </div>
          </div>
        </div>

        {/* Reset */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setSettings(DEFAULTS);
              saveSettings(DEFAULTS);
              setTheme("system");
            }}
            className="text-xs text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
          >
            Reset all settings to defaults
          </button>
        </div>

        {/* Disconnect */}
        {isConnected && (
          <div className="mt-8 text-center">
            <button
              onClick={() => disconnect()}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-5 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Disconnect Wallet
            </button>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
