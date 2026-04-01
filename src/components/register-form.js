'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selfRegister } from "@/app/actions";

const STEPS = ["Church", "Details", "Done"];

export function RegisterForm({ orgs = [], preselectedOrgId = "", preselectedBranches = [] }) {
  const router = useRouter();
  const [step, setStep] = useState(preselectedOrgId ? 2 : 1);
  const [orgId, setOrgId] = useState(preselectedOrgId);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState(preselectedBranches);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleOrgChange(e) {
    const selectedOrgId = e.target.value;
    setOrgId(selectedOrgId);
    setBranchId("");
    setBranches([]);
    if (!selectedOrgId) return;
    setLoadingBranches(true);
    try {
      const res = await fetch(`/api/branches?orgId=${selectedOrgId}`);
      const data = await res.json();
      setBranches(data.branches || []);
    } catch {
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  }

  function handleStep1Submit(e) {
    e.preventDefault();
    if (!orgId) { setError("Please select your church."); return; }
    if (!branchId) { setError("Please select your branch."); return; }
    setError("");
    setStep(2);
  }

  function handleStep2Submit(e) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.target);
    formData.set("organizationId", orgId);
    formData.set("branchId", branchId);

    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const confirmPassword = formData.get("confirmPassword")?.toString();

    if (!name) { setError("Full name is required."); return; }
    if (!email) { setError("Email address is required."); return; }
    if (!password || password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    startTransition(async () => {
      const result = await selfRegister(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setStep(3);
        setTimeout(() => router.push("/"), 1500);
      }
    });
  }

  const orgName = orgs.find(o => o.id === orgId)?.name || "";
  const branchName = branches.find(b => b.id === branchId)?.name || "";

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => {
          const num = i + 1;
          const done = step > num;
          const active = step === num;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                done ? "bg-moss text-white" : active ? "border-2 border-moss text-moss" : "border border-line text-muted"
              }`}>
                {done ? "✓" : num}
              </div>
              <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="h-px w-6 bg-line" />}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Church selection */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-5">
          <div>
            <p className="mb-5 text-sm font-semibold text-foreground">Which church are you part of?</p>

            <label className="block">
              <span className="text-sm font-medium text-foreground">Church / Organisation</span>
              <select
                value={orgId}
                onChange={handleOrgChange}
                className="mt-2 block w-full rounded-[1rem] border border-line bg-paper px-4 py-3.5 text-sm text-foreground focus:border-moss focus:outline-none"
              >
                <option value="">Select your church...</option>
                {orgs.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </label>

            {orgId && (
              <label className="mt-4 block">
                <span className="text-sm font-medium text-foreground">Branch / Campus</span>
                {loadingBranches ? (
                  <div className="mt-2 h-12 animate-pulse rounded-[1rem] bg-canvas" />
                ) : (
                  <select
                    value={branchId}
                    onChange={e => setBranchId(e.target.value)}
                    className="mt-2 block w-full rounded-[1rem] border border-line bg-paper px-4 py-3.5 text-sm text-foreground focus:border-moss focus:outline-none"
                  >
                    <option value="">Select your branch...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}{b.locationLabel ? ` — ${b.locationLabel}` : ""}</option>
                    ))}
                  </select>
                )}
              </label>
            )}
          </div>

          {error && <p className="rounded-[0.9rem] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Continue
          </button>
        </form>
      )}

      {/* Step 2 — Personal details */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="space-y-5">
          {/* Selected church summary */}
          {orgName && (
            <div className="flex items-center gap-3 rounded-[1rem] border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-3">
              <span className="text-moss">⛪</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-moss">{orgName}</p>
                {branchName && <p className="text-xs text-muted">{branchName}</p>}
              </div>
              <button type="button" onClick={() => setStep(1)} className="ml-auto text-xs text-muted underline">Change</button>
            </div>
          )}

          <p className="text-sm font-semibold text-foreground">Your details</p>

          <FormField label="Full name" name="name" placeholder="Your full name" required />
          <FormField label="Email address" name="email" type="email" placeholder="you@example.com" required />
          <FormField label="Phone number" name="phone" type="tel" placeholder="+234 800 000 0000" />

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">Date of birth</span>
              <input type="date" name="birthday" className="mt-2 block w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground focus:border-moss focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Gender</span>
              <select name="gender" className="mt-2 block w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground focus:border-moss focus:outline-none">
                <option value="unspecified">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Are you a new member?</span>
            <select name="memberType" className="mt-2 block w-full rounded-[1rem] border border-line bg-paper px-4 py-3 text-sm text-foreground focus:border-moss focus:outline-none">
              <option value="member">I am a regular member</option>
              <option value="new_member">I recently joined this church</option>
              <option value="visitor">I am visiting</option>
            </select>
            <p className="mt-1.5 text-xs text-muted">New members are enrolled in a 30-day welcome journey.</p>
          </label>

          <div className="border-t border-line pt-4">
            <p className="mb-3 text-sm font-medium text-foreground">Set a password</p>
            <FormField label="Password" name="password" type="password" placeholder="Min. 8 characters" required />
            <div className="mt-4">
              <FormField label="Confirm password" name="confirmPassword" type="password" placeholder="Repeat your password" required />
            </div>
          </div>

          {error && <p className="rounded-[0.9rem] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="inline-flex w-1/3 items-center justify-center rounded-[1.15rem] border border-line bg-canvas px-4 py-4 text-sm font-medium text-foreground transition hover:bg-paper">
              Back
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex flex-1 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,#2563eb,#4f46e5)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? "Creating account…" : "Create account"}
            </button>
          </div>

          <p className="text-center text-xs text-muted">
            Your information is private and only visible to your church's care team.
          </p>
        </form>
      )}

      {/* Step 3 — Done */}
      {step === 3 && (
        <div className="py-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--soft-fill)] text-3xl">
            ✓
          </div>
          <h2 className="mt-5 text-xl font-bold text-foreground">Welcome!</h2>
          <p className="mt-2 text-sm text-muted">Your account has been created. Signing you in…</p>
        </div>
      )}
    </div>
  );
}

function FormField({ label, name, type = "text", placeholder, required = false }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        className="mt-2 block w-full rounded-[1rem] border border-line bg-paper px-4 py-3.5 text-sm text-foreground placeholder:text-muted focus:border-moss focus:outline-none"
      />
    </label>
  );
}
