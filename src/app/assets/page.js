import { cookies } from "next/headers";
import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/database";
import { getWorkspaceContext } from "@/lib/organization-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";
import { getUserModulePermissions, requireModuleAccess } from "@/lib/permissions";
import AssetForm from "@/components/AssetForm";
import CheckoutForm from "@/components/CheckoutForm";

export const metadata = { title: "Asset Register" };

const ASSET_CATEGORIES = [
  { key: "audio",       label: "Audio / Sound",     icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { key: "projection",  label: "Projection / Visual", icon: "M15 10l4.553-2.069A1 1 0 0121 8.82V15.18a1 1 0 01-1.447.89L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" },
  { key: "instrument",  label: "Instruments",        icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" },
  { key: "furniture",   label: "Furniture / Décor",  icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { key: "vehicle",     label: "Vehicles",           icon: "M8 17h8m-8 0a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4zm-8-2h8M5 11h14l1-6H4l1 6z" },
  { key: "tech",        label: "Tech / IT",          icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" },
  { key: "generator",   label: "Generator / Power",  icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { key: "equipment",   label: "General Equipment",  icon: "M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" },
];

const STATUS_STYLES = {
  available:   { dot: "bg-green-500",  label: "Available",   text: "text-green-700 bg-green-50" },
  checked_out: { dot: "bg-amber-500",  label: "Checked out", text: "text-amber-700 bg-amber-50" },
  maintenance: { dot: "bg-red-500",    label: "Maintenance", text: "text-red-700 bg-red-50" },
  retired:     { dot: "bg-gray-400",   label: "Retired",     text: "text-gray-600 bg-gray-100" },
};

function getAssets(orgId, branchId) {
  try {
    const db = getDatabase();
    return db.prepare(`
      SELECT a.*, u.name AS creator_name
      FROM church_assets a
      LEFT JOIN users u ON u.id = a.created_by
      WHERE a.organization_id = ?
        AND (a.branch_id = ? OR a.branch_id IS NULL OR ? = '')
      ORDER BY a.category, a.name
    `).all(orgId, branchId, branchId);
  } catch { return []; }
}

function getUtilityLogs(orgId, branchId) {
  try {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM utility_logs
      WHERE organization_id = ?
        AND (branch_id = ? OR branch_id IS NULL OR ? = '')
      ORDER BY logged_at DESC
      LIMIT 30
    `).all(orgId, branchId, branchId);
  } catch { return []; }
}

function getCheckouts(orgId) {
  try {
    const db = getDatabase();
    return db.prepare(`
      SELECT ac.*, ca.name AS asset_name, ca.category
      FROM asset_checkouts ac
      JOIN church_assets ca ON ca.id = ac.asset_id
      WHERE ac.organization_id = ?
        AND ac.returned_date IS NULL
      ORDER BY ac.checkout_date DESC
    `).all(orgId);
  } catch { return []; }
}

function getAssetStats(assets) {
  const total = assets.length;
  const available = assets.filter(a => a.status === "available").length;
  const checkedOut = assets.filter(a => a.status === "checked_out").length;
  const maintenance = assets.filter(a => a.status === "maintenance").length;
  const totalValue = assets.reduce((sum, a) => sum + (a.acquisition_cost || 0), 0);
  return { total, available, checkedOut, maintenance, totalValue };
}

export default async function AssetsPage() {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const permissions = getUserModulePermissions(user);
  requireModuleAccess(permissions, "assets", "read");

  const cookieStore = await cookies();
  const workspace = getWorkspaceContext(user, cookieStore.get(WORKSPACE_BRANCH_COOKIE)?.value || "");
  const branchId = workspace.activeBranch?.id || user.branchId || "";
  const orgId = user.organizationId;

  const assets = getAssets(orgId, branchId);
  const utilityLogs = getUtilityLogs(orgId, branchId);
  const activeCheckouts = getCheckouts(orgId);
  const stats = getAssetStats(assets);
  const canManage = permissions.assets === "lead" || permissions.assets === "full";

  const byCategory = {};
  for (const cat of ASSET_CATEGORIES) byCategory[cat.key] = [];
  for (const asset of assets) {
    const key = asset.category || "equipment";
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(asset);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-text)]">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Asset Register</h1>
          <p className="mt-1 text-sm text-muted">
            {stats.total} items tracked · {stats.available} available · {stats.checkedOut} out
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link
              href="/assets/utility"
              className="flex items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-paper px-3.5 py-2 text-xs font-medium text-foreground transition hover:bg-[rgba(18,18,18,0.04)]"
            >
              <svg className="h-3.5 w-3.5 text-[var(--gold-text)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Utility log
            </Link>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total assets",   value: stats.total,       icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
          { label: "Available",      value: stats.available,   icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
          { label: "Checked out",    value: stats.checkedOut,  icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
          { label: "In maintenance", value: stats.maintenance, icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-[var(--line)] bg-paper p-4 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-[var(--gold-text)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Active checkouts */}
      {activeCheckouts.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Currently out</h2>
          <div className="space-y-2">
            {activeCheckouts.map(co => (
              <div key={co.id} className="flex items-center gap-4 rounded-xl border border-[var(--line)] bg-paper px-4 py-3 shadow-[var(--shadow-sm)]">
                <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{co.asset_name}</p>
                  <p className="text-xs text-muted">
                    Checked out by <strong>{co.checked_out_name}</strong>
                    {co.event_name ? ` · ${co.event_name}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted">{co.checkout_date?.slice(0, 10)}</p>
                  {co.expected_return && (
                    <p className="text-[11px] text-amber-600">Due {co.expected_return?.slice(0, 10)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Asset register by category */}
      <section className="space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">All assets</h2>

        {ASSET_CATEGORIES.map(cat => {
          const catAssets = byCategory[cat.key] || [];
          if (catAssets.length === 0) return null;
          return (
            <div key={cat.key}>
              <div className="mb-2 flex items-center gap-2">
                <svg className="h-3.5 w-3.5 text-[var(--gold-text)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                </svg>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{cat.label}</span>
                <span className="text-[10px] text-muted">({catAssets.length})</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-paper shadow-[var(--shadow-sm)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] bg-[rgba(18,18,18,0.02)]">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Item</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted hidden sm:table-cell">Location</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Status</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted hidden md:table-cell">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {catAssets.map(asset => {
                      const status = STATUS_STYLES[asset.status] || STATUS_STYLES.available;
                      return (
                        <tr key={asset.id} className="hover:bg-[rgba(18,18,18,0.02)] transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground text-sm">{asset.name}</p>
                            {asset.serial_number && (
                              <p className="text-[10px] text-muted">S/N: {asset.serial_number}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted hidden sm:table-cell">
                            {asset.location || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted capitalize hidden md:table-cell">
                            {asset.condition || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {assets.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--line)] py-12 text-center">
            <p className="text-sm text-muted">No assets registered yet.</p>
            {canManage && <p className="mt-1 text-xs text-muted">Use the form below to add your first asset.</p>}
          </div>
        )}
      </section>

      {/* Utility log snapshot */}
      {utilityLogs.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Recent utility logs</h2>
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-paper shadow-[var(--shadow-sm)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[rgba(18,18,18,0.02)]">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Type</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Amount</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted hidden sm:table-cell">Logged by</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {utilityLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[rgba(18,18,18,0.02)] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground capitalize">{log.utility_type?.replace("_", " ")}</p>
                      {log.event_name && <p className="text-[10px] text-muted">{log.event_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {log.value} {log.unit}
                      {log.cost ? <span className="ml-1 text-xs text-muted">(₦{Number(log.cost).toLocaleString()})</span> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted hidden sm:table-cell">{log.logged_by_name}</td>
                    <td className="px-4 py-3 text-xs text-muted">{log.logged_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Add asset form — leads only */}
      {canManage && (
        <section className="rounded-2xl border border-[var(--line)] bg-paper p-6 shadow-[var(--shadow-sm)]">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Register a new asset</h2>
          <AssetForm organizationId={orgId} branchId={branchId} />
        </section>
      )}

      {/* Log utility — leads only */}
      {canManage && (
        <section className="rounded-2xl border border-[var(--line)] bg-paper p-6 shadow-[var(--shadow-sm)]">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Log utility usage</h2>
          <CheckoutForm organizationId={orgId} type="utility" />
        </section>
      )}
    </div>
  );
}
