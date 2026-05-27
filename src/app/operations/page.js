import Link from "next/link";
import { cookies } from "next/headers";
import {
  adjustInventoryItem,
  createFuelTank,
  createInventoryItem,
  createOperationsAsset,
  createOperationsPurchaseRequest,
  createOperationsWorkOrder,
  recordFuelLog,
} from "@/app/actions";
import { FlashBanner } from "@/components/flash-banner";
import { SubmitButton } from "@/components/submit-button";
import { requireCurrentUser } from "@/lib/auth";
import { getOperationsCommandData } from "@/lib/operations-store";
import { WORKSPACE_BRANCH_COOKIE } from "@/lib/workspace-scope";

export const metadata = {
  title: "Operations Command",
  description:
    "Branch operations, diesel, inventory, assets, maintenance, and purchase signals for church management.",
};

const signalTone = {
  critical: "badge-crisis",
  warning: "badge-urgent",
  steady: "badge-new",
};

export default async function OperationsPage({ searchParams }) {
  const user = await requireCurrentUser(["leader", "pastor", "owner"]);
  const preferredBranchId = (await cookies()).get(WORKSPACE_BRANCH_COOKIE)?.value || "";
  const params = await searchParams;
  const data = getOperationsCommandData(user, preferredBranchId);
  const notice = typeof params?.notice === "string" ? params.notice : "";
  const error = typeof params?.error === "string" ? params.error : "";
  const branchOptions = data.workspace.visibleBranches;
  const defaultBranchId =
    data.workspace.activeBranchId || user.branchId || branchOptions[0]?.id || "";

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 pb-20 lg:px-10 lg:py-14">
      <section className="border-b border-line pb-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-4xl">
            <p className="eyebrow">{data.workspace.organizationShortName}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-foreground [font-family:var(--font-display)] sm:text-5xl">
              Operations Command
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">
              Inventory, diesel, assets, maintenance, and purchase readiness for every
              branch in one management rhythm.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 xl:justify-end">
            <ScopeChip label="Scope" value={data.workspace.scopeLabel} />
            <Link href="/ecosystem" className="btn-secondary">
              Ecosystem
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <FlashBanner
            notice={notice}
            error={error}
            noticeTitle="Saved"
            errorTitle="Could not continue"
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Signals" value={data.summary.signals} detail="resource alerts" />
          <KpiCard
            label="Low inventory"
            value={data.summary.lowInventory}
            detail="items under reorder"
            tone={data.summary.lowInventory > 0 ? "warning" : "steady"}
          />
          <KpiCard
            label="Low diesel"
            value={data.summary.lowFuel}
            detail="fuel trackers"
            tone={data.summary.lowFuel > 0 ? "critical" : "steady"}
          />
          <KpiCard
            label="Work orders"
            value={data.summary.openWorkOrders}
            detail="open maintenance"
            tone={data.summary.openWorkOrders > 0 ? "warning" : "steady"}
          />
          <KpiCard
            label="Purchases"
            value={data.summary.pendingPurchases}
            detail="pending requests"
          />
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Panel
          eyebrow="Resource signals"
          title="What management should act on now"
          action={{ href: "/reports", label: "Reports" }}
        >
          <SignalList signals={data.resourceSignals} />
        </Panel>

        <Panel
          eyebrow="Diesel intelligence"
          title="Fuel reserve and generator readiness"
          action={{ href: "#fuel", label: "Fuel" }}
        >
          {data.fuelTanks.length === 0 ? (
            <EmptyState body="No fuel trackers yet." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.fuelTanks.slice(0, 4).map((tank) => (
                <FuelCard key={tank.id} tank={tank} />
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section id="fuel" className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel eyebrow="Fuel log" title="Record diesel refill or usage">
          <form action={recordFuelLog} className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Fuel tracker"
              name="tankId"
              options={data.fuelTanks.map((tank) => ({
                value: tank.id,
                label: `${tank.assetName} (${tank.levelLabel})`,
              }))}
            />
            <SelectField
              label="Movement"
              name="logType"
              options={[
                { value: "refill", label: "Refill" },
                { value: "usage", label: "Usage" },
              ]}
            />
            <Field label="Litres" name="quantityLitres" type="number" step="0.1" />
            <Field label="Generator hours" name="generatorHours" type="number" step="0.1" />
            <Field label="Reading time" name="readingAt" type="datetime-local" />
            <Field label="Note" name="notes" />
            <SubmitButton
              idleLabel="Record fuel"
              pendingLabel="Recording..."
              className="btn-primary md:col-span-2"
            />
          </form>
        </Panel>

        <Panel eyebrow="Add tracker" title="Track another generator or tank">
          <form action={createFuelTank} className="grid gap-4 md:grid-cols-2">
            <BranchField branches={branchOptions} defaultValue={defaultBranchId} />
            <Field label="Generator / tank" name="assetName" placeholder="Main generator" />
            <Field label="Fuel type" name="fuelType" defaultValue="diesel" />
            <Field label="Capacity (L)" name="capacityLitres" type="number" step="0.1" />
            <Field label="Current litres" name="currentLitres" type="number" step="0.1" />
            <Field label="Reorder level (L)" name="reorderLevelLitres" type="number" step="0.1" />
            <Field label="Avg daily use (L)" name="averageDailyLitres" type="number" step="0.1" />
            <Field label="Note" name="notes" />
            <SubmitButton
              idleLabel="Add fuel tracker"
              pendingLabel="Adding..."
              className="btn-secondary md:col-span-2"
            />
          </form>
        </Panel>
      </section>

      <section id="inventory" className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel eyebrow="Inventory" title="Stock levels and reorder points">
          {data.inventory.length === 0 ? (
            <EmptyState body="No inventory items yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[46rem]">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th className="text-right">On hand</th>
                    <th className="text-right">Reorder</th>
                    <th>Status</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.map((item) => (
                    <tr key={item.id}>
                      <td className="font-semibold">{item.name}</td>
                      <td>{item.category}</td>
                      <td className="text-right font-semibold">{item.quantityLabel}</td>
                      <td className="text-right">{item.reorderLabel}</td>
                      <td>
                        <span className={`badge ${signalTone[item.status]}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.storageLocation || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel eyebrow="Stock actions" title="Add or adjust inventory">
          <form action={createInventoryItem} className="grid gap-4">
            <BranchField branches={branchOptions} defaultValue={defaultBranchId} />
            <Field label="Item" name="name" placeholder="Communion cups" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" name="category" placeholder="Service supplies" />
              <Field label="Unit" name="unit" placeholder="packs" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quantity" name="quantity" type="number" step="0.1" />
              <Field label="Reorder level" name="reorderLevel" type="number" step="0.1" />
            </div>
            <Field label="Storage location" name="storageLocation" />
            <Field label="Preferred vendor" name="preferredVendor" />
            <SubmitButton
              idleLabel="Add item"
              pendingLabel="Adding..."
              className="btn-primary"
            />
          </form>

          <form action={adjustInventoryItem} className="mt-6 grid gap-4 border-t border-line pt-5">
            <SelectField
              label="Item"
              name="itemId"
              options={data.inventory.map((item) => ({
                value: item.id,
                label: `${item.name} (${item.quantityLabel})`,
              }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Mode"
                name="mode"
                options={[
                  { value: "set", label: "Set quantity" },
                  { value: "add", label: "Add / remove" },
                ]}
              />
              <Field label="Quantity" name="quantity" type="number" step="0.1" />
            </div>
            <Field label="Note" name="notes" />
            <SubmitButton
              idleLabel="Update stock"
              pendingLabel="Updating..."
              className="btn-secondary"
            />
          </form>
        </Panel>
      </section>

      <section id="assets" className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel eyebrow="Assets" title="Equipment and service schedule">
          {data.assets.length === 0 ? (
            <EmptyState body="No assets tracked yet." />
          ) : (
            <div className="space-y-3">
              {data.assets.slice(0, 8).map((asset) => (
                <AssetRow key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </Panel>

        <Panel eyebrow="Register asset" title="Add equipment or facilities asset">
          <form action={createOperationsAsset} className="grid gap-4 md:grid-cols-2">
            <BranchField branches={branchOptions} defaultValue={defaultBranchId} />
            <Field label="Asset name" name="name" placeholder="Main generator" />
            <Field label="Type" name="assetType" placeholder="Generator" />
            <Field label="Location" name="location" placeholder="Generator house" />
            <SelectField
              label="Status"
              name="status"
              options={[
                { value: "active", label: "Active" },
                { value: "needs_service", label: "Needs service" },
                { value: "retired", label: "Retired" },
              ]}
            />
            <Field label="Service interval days" name="serviceIntervalDays" type="number" />
            <Field label="Last serviced" name="lastServicedAt" type="date" />
            <Field label="Next service" name="nextServiceAt" type="date" />
            <Field label="Notes" name="notes" />
            <SubmitButton
              idleLabel="Add asset"
              pendingLabel="Adding..."
              className="btn-secondary md:col-span-2"
            />
          </form>
        </Panel>
      </section>

      <section id="maintenance" className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel eyebrow="Maintenance" title="Open work orders">
          {data.workOrders.length === 0 ? (
            <EmptyState body="No work orders yet." />
          ) : (
            <div className="space-y-3">
              {data.workOrders.slice(0, 8).map((order) => (
                <WorkOrderRow key={order.id} order={order} />
              ))}
            </div>
          )}
        </Panel>

        <Panel eyebrow="Open work order" title="Schedule a repair or service">
          <form action={createOperationsWorkOrder} className="grid gap-4">
            <BranchField branches={branchOptions} defaultValue={defaultBranchId} />
            <Field label="Title" name="title" placeholder="Service main generator" />
            <SelectField
              label="Asset"
              name="assetId"
              options={[
                { value: "", label: "No linked asset" },
                ...data.assets.map((asset) => ({
                  value: asset.id,
                  label: asset.name,
                })),
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Priority"
                name="priority"
                options={[
                  { value: "medium", label: "Medium" },
                  { value: "critical", label: "Critical" },
                  { value: "high", label: "High" },
                  { value: "low", label: "Low" },
                ]}
              />
              <SelectField
                label="Status"
                name="status"
                options={[
                  { value: "open", label: "Open" },
                  { value: "in_progress", label: "In progress" },
                  { value: "completed", label: "Completed" },
                ]}
              />
            </div>
            <Field label="Due date" name="dueAt" type="date" />
            <Field label="Assigned to" name="assignedTo" />
            <Field label="Vendor" name="vendor" />
            <Field label="Notes" name="notes" />
            <SubmitButton
              idleLabel="Open work order"
              pendingLabel="Opening..."
              className="btn-primary"
            />
          </form>
        </Panel>
      </section>

      <section id="purchases" className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel eyebrow="Purchases" title="Requests and approvals">
          {data.purchaseRequests.length === 0 ? (
            <EmptyState body="No purchase requests yet." />
          ) : (
            <div className="space-y-3">
              {data.purchaseRequests.slice(0, 8).map((request) => (
                <PurchaseRow key={request.id} request={request} />
              ))}
            </div>
          )}
        </Panel>

        <Panel eyebrow="Request purchase" title="Create procurement signal">
          <form action={createOperationsPurchaseRequest} className="grid gap-4 md:grid-cols-2">
            <BranchField branches={branchOptions} defaultValue={defaultBranchId} />
            <Field label="Title" name="title" placeholder="Order 600L diesel refill" />
            <Field label="Category" name="category" placeholder="Fuel" />
            <Field label="Estimated amount" name="estimatedAmount" type="number" step="0.01" />
            <Field label="Needed by" name="neededBy" type="date" />
            <SelectField
              label="Status"
              name="status"
              options={[
                { value: "requested", label: "Requested" },
                { value: "approved", label: "Approved" },
                { value: "ordered", label: "Ordered" },
              ]}
            />
            <Field label="Notes" name="notes" />
            <SubmitButton
              idleLabel="Open purchase request"
              pendingLabel="Opening..."
              className="btn-secondary md:col-span-2"
            />
          </form>
        </Panel>
      </section>

      <section className="mt-6">
        <Panel eyebrow="Branch operations" title="Campus resource pressure">
          <BranchOpsTable branches={data.branchOps} />
        </Panel>
      </section>
    </div>
  );
}

function ScopeChip({ label, value }) {
  return (
    <div className="inline-flex min-h-12 items-center gap-3 rounded-[1rem] border border-line bg-paper px-4 py-2">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <span className="max-w-[14rem] truncate text-sm font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}

function KpiCard({ label, value, detail, tone = "steady" }) {
  const toneClass =
    tone === "critical"
      ? "border-[rgba(225,29,72,0.18)] bg-[rgba(225,29,72,0.08)]"
      : tone === "warning"
        ? "border-[rgba(217,119,6,0.18)] bg-[rgba(217,119,6,0.08)]"
        : "border-[var(--soft-accent-border)] bg-[var(--soft-fill)]";

  return (
    <article className={`rounded-[1.35rem] border p-5 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground [font-family:var(--font-display)]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}

function Panel({ eyebrow, title, action, children }) {
  return (
    <section className="surface-card bg-paper p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold leading-tight text-foreground">
            {title}
          </h2>
        </div>
        {action ? (
          <Link href={action.href} className="btn-secondary">
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SignalList({ signals }) {
  if (signals.length === 0) {
    return <EmptyState body="No resource signals in this scope." />;
  }

  return (
    <div className="space-y-3">
      {signals.map((signal) => (
        <Link
          key={signal.id}
          href={signal.href}
          className="block rounded-[1rem] border border-line bg-canvas px-4 py-3 transition hover:border-[var(--soft-accent-border)] hover:bg-[var(--soft-fill)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{signal.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{signal.detail}</p>
            </div>
            <span className={`badge ${signalTone[signal.tone] || "badge-new"}`}>
              {signal.tone}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function FuelCard({ tank }) {
  return (
    <article className="rounded-[1.15rem] border border-line bg-canvas p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{tank.assetName}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">
            {tank.fuelType}
          </p>
        </div>
        <span className={`badge ${signalTone[tank.status]}`}>{tank.status}</span>
      </div>
      <div className="mt-5">
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
            {tank.percent}%
          </p>
          <p className="text-sm text-muted">{tank.levelLabel}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(100,116,139,0.16)]">
          <div
            className={`h-full rounded-full ${
              tank.status === "critical"
                ? "bg-clay"
                : tank.status === "warning"
                  ? "bg-gold"
                  : "bg-moss"
            }`}
            style={{ width: `${Math.max(4, Math.min(100, tank.percent))}%` }}
          />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">
        Estimated reserve: <span className="font-semibold text-foreground">{tank.daysRemainingLabel}</span>.
      </p>
    </article>
  );
}

function AssetRow({ asset }) {
  return (
    <div className="rounded-[1rem] border border-line bg-canvas px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{asset.name}</p>
          <p className="mt-1 text-xs text-muted">
            {asset.assetType} - {asset.location || "No location"}
          </p>
        </div>
        <span className={`badge ${signalTone[asset.serviceStatus]}`}>
          {asset.serviceStatus}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">Next service: {asset.nextServiceLabel}</p>
    </div>
  );
}

function WorkOrderRow({ order }) {
  return (
    <div className="rounded-[1rem] border border-line bg-canvas px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{order.title}</p>
          <p className="mt-1 text-xs text-muted">
            {order.assignedTo || "Unassigned"} - {order.dueLabel}
          </p>
        </div>
        <span className={`badge ${order.priority === "critical" ? "badge-crisis" : "badge-urgent"}`}>
          {order.priority}
        </span>
      </div>
    </div>
  );
}

function PurchaseRow({ request }) {
  return (
    <div className="rounded-[1rem] border border-line bg-canvas px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{request.title}</p>
          <p className="mt-1 text-xs text-muted">
            {request.category} - {request.neededByLabel}
          </p>
        </div>
        <span className="badge badge-new">{request.status}</span>
      </div>
    </div>
  );
}

function BranchOpsTable({ branches }) {
  if (branches.length === 0) {
    return <EmptyState body="No branch operations data is visible." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[48rem]">
        <thead>
          <tr>
            <th>Branch</th>
            <th>Region</th>
            <th className="text-right">Signals</th>
            <th className="text-right">Low fuel</th>
            <th className="text-right">Low inventory</th>
            <th className="text-right">Work orders</th>
            <th>Health</th>
          </tr>
        </thead>
        <tbody>
          {branches.map((branch) => (
            <tr key={branch.id}>
              <td className="font-semibold">{branch.name}</td>
              <td>{branch.regionName}</td>
              <td className="text-right font-semibold">{branch.signalCount}</td>
              <td className="text-right">{branch.lowFuelCount}</td>
              <td className="text-right">{branch.lowInventoryCount}</td>
              <td className="text-right">{branch.openWorkOrders}</td>
              <td>
                <span
                  className={`badge ${
                    branch.health === "At risk"
                      ? "badge-crisis"
                      : branch.health === "Watch"
                        ? "badge-urgent"
                        : "badge-new"
                  }`}
                >
                  {branch.health}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BranchField({ branches, defaultValue }) {
  return (
    <SelectField
      label="Branch"
      name="branchId"
      defaultValue={defaultValue}
      options={branches.map((branch) => ({
        value: branch.id,
        label: branch.name,
      }))}
    />
  );
}

function Field({ label, name, type = "text", defaultValue = "", placeholder = "", step }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="input-field mt-2"
      />
    </label>
  );
}

function SelectField({ label, name, options, defaultValue = "" }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select name={name} defaultValue={defaultValue} className="input-field mt-2">
        {options.length === 0 ? <option value="">No options</option> : null}
        {options.map((option) => (
          <option key={`${name}:${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({ body }) {
  return (
    <div className="rounded-[1rem] border border-dashed border-line bg-canvas p-6 text-sm leading-7 text-muted">
      {body}
    </div>
  );
}
