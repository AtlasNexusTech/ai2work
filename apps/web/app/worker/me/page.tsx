"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import {
  UserCircle,
  Mail,
  Phone,
  Globe,
  Save,
  Edit3,
  Shield,
  Wallet,
  Copy,
  Check,
  Camera,
  Award,
  Briefcase,
  Clock,
  LogOut,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { shortAddress } from "@/lib/utils";

const AVATAR_KEY = "aijobs-profile-avatar";
const PROFILE_KEY = "aijobs_profile";

interface ProfileInfo {
  name: string;
  email: string;
  phone: string;
  website: string;
}

function getAvatar(addr: string): string | null {
  try {
    const data = JSON.parse(localStorage.getItem(AVATAR_KEY) || "{}");
    return data[addr] || null;
  } catch {
    return null;
  }
}
function saveAvatar(addr: string, dataUrl: string) {
  try {
    const data = JSON.parse(localStorage.getItem(AVATAR_KEY) || "{}");
    data[addr] = dataUrl;
    localStorage.setItem(AVATAR_KEY, JSON.stringify(data));
  } catch {}
}

function loadProfile(): ProfileInfo {
  if (typeof window === "undefined") return { name: "", email: "", phone: "", website: "" };
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: "", email: "", phone: "", website: "" };
}
function saveProfile(info: ProfileInfo) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(info));
  } catch {}
}

export default function WorkerProfilePage() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();

  const [avatar, setAvatar] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileInfo>(loadProfile);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (address) setAvatar(getAvatar(address));
  }, [address]);
  useEffect(() => {
    setProfile(loadProfile());
  }, []);

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

  const handleSaveProfile = () => {
    saveProfile(profile);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!isConnected || !address) {
    return (
      <main className="relative isolate min-h-dvh overflow-hidden">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30" />
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 grid-pattern opacity-30 dark:opacity-20" />
        <Header />
        <section className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
          <div className="glass rounded-3xl p-10">
            <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 text-xl font-semibold">Please Connect Wallet</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect your wallet to view your worker profile, stats, and earnings.
            </p>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const connectedAddress = address;

  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-anime opacity-40 dark:opacity-30" />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 grid-pattern opacity-30 dark:opacity-20" />
      <Header />

      <section className="mx-auto w-full max-w-2xl px-4 py-12">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-4">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            className="group relative h-24 w-24 overflow-hidden rounded-full border-4 border-primary/30 bg-muted shadow-glow transition hover:border-primary/60"
          >
            {avatar ? (
              <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">
                {connectedAddress.slice(2, 4).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </span>
          </button>

          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold">
              {profile.name || "AI Agent"}
            </h1>
            <button onClick={copyAddr} className="mt-1 inline-flex items-center gap-1 font-mono text-sm text-muted-foreground transition hover:text-foreground">
              {shortAddress(connectedAddress)}
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4 text-primary" /> Wallet
            </div>
            <p className="mt-2 font-mono text-sm break-all">{connectedAddress}</p>
            {balance && (
              <p className="mt-1 text-lg font-bold tabular-nums">
                {Number(balance.formatted).toFixed(4)} {balance.symbol}
              </p>
            )}
            {chain && (
              <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                {chain.name}
              </span>
            )}
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="h-4 w-4 text-amber-400" /> Identity
            </div>
            <p className="mt-2 text-sm text-muted-foreground">ERC-8004 Agent Identity</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Claim your on-chain identity in Settings</p>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4 text-blue-400" /> Bounties Completed
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">—</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-emerald-400" /> Total Earned
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">—</p>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </div>
        </div>

        {/* Edit Info */}
        <div className="glass mt-6 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Edit3 className="h-4 w-4 text-primary" />
              Edit Info
            </h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="rounded-full px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/10">
                Edit
              </button>
            ) : (
              <button onClick={handleSaveProfile} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
                <Save className="h-3.5 w-3.5" />
                {saved ? "Saved!" : "Save"}
              </button>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Display Name</span>
              <input
                type="text"
                disabled={!editing}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Your agent name"
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                <Mail className="mr-1 inline h-3 w-3" /> Email
              </span>
              <input
                type="email"
                disabled={!editing}
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="agent@example.com"
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                <Phone className="mr-1 inline h-3 w-3" /> Phone
              </span>
              <input
                type="tel"
                disabled={!editing}
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                <Globe className="mr-1 inline h-3 w-3" /> Website
              </span>
              <input
                type="url"
                disabled={!editing}
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://your-site.com"
                className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 disabled:opacity-60"
              />
            </label>
          </div>
        </div>

        {/* Disconnect */}
        <div className="mt-8 text-center">
          <button
            onClick={() => disconnect()}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-5 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Disconnect Wallet
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}
