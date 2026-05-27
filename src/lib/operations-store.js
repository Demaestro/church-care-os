import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";
import { getDatabase } from "@/lib/database";
import {
  getBranchOverview,
  getWorkspaceContext,
} from "@/lib/organization-store";
import {
  buildViewerScope,
  recordMatchesViewerScope,
  resolveUserBranchId,
  resolveUserOrganizationId,
} from "@/lib/workspace-scope";

const lowStockTone = {
  critical: "critical",
  warning: "warning",
  steady: "steady",
};

export const getOperationsCommandData = cache(function getOperationsCommandData(
  viewer,
  preferredBranchId = ""
) {
  const workspace = getWorkspaceContext(viewer, preferredBranchId);
  const activeBranchId =
    workspace.activeBranch?.id ||
    (viewer?.accessScope === "organization" ? "" : resolveUserBranchId(viewer));
  const branches = getBranchOverview(viewer, activeBranchId);
  const inventory = listInventoryItems(viewer, activeBranchId);
  const fuelTanks = listFuelTanks(viewer, activeBranchId);
  const assets = listAssets(viewer, activeBranchId);
  const workOrders = listWorkOrders(viewer, activeBranchId);
  const purchaseRequests = listPurchaseRequests(viewer, activeBranchId);
  const fuelLogs = listFuelLogs(viewer, activeBranchId, 80);
  const resourceSignals = buildResourceSignals({
    inventory,
    fuelTanks,
    assets,
    workOrders,
    purchaseRequests,
  });
  const summary = buildOperationsSummary({
    inventory,
    fuelTanks,
    assets,
    workOrders,
    purchaseRequests,
    resourceSignals,
  });
  const branchOps = buildBranchOperations({
    branches,
    inventory,
    fuelTanks,
    assets,
    workOrders,
  });

  return {
    workspace: {
      organizationName: workspace.organization.name,
      organizationShortName: workspace.organization.shortName || workspace.organization.name,
      scopeLabel: workspace.activeScopeLabel,
      activeBranchId,
      visibleBranches: workspace.visibleBranches,
      canSwitchBranches: workspace.canSwitchBranches,
    },
    summary,
    resourceSignals,
    inventory,
    fuelTanks,
    fuelLogs,
    assets,
    workOrders,
    purchaseRequests,
    branchOps,
  };
});

export const getOperationsSummaryData = cache(function getOperationsSummaryData(
  viewer,
  preferredBranchId = ""
) {
  const workspace = getWorkspaceContext(viewer, preferredBranchId);
  const activeBranchId =
    workspace.activeBranch?.id ||
    (viewer?.accessScope === "organization" ? "" : resolveUserBranchId(viewer));
  const inventory = listInventoryItems(viewer, activeBranchId);
  const fuelTanks = listFuelTanks(viewer, activeBranchId);
  const assets = listAssets(viewer, activeBranchId);
  const workOrders = listWorkOrders(viewer, activeBranchId);
  const purchaseRequests = listPurchaseRequests(viewer, activeBranchId);

  return {
    activeBranchId,
    summary: buildOperationsSummary({
      inventory,
      fuelTanks,
      assets,
      workOrders,
      purchaseRequests,
    }),
  };
});

export function listInventoryItems(viewer = null, preferredBranchId = "") {
  const rows = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        branch_id,
        name,
        category,
        unit,
        quantity,
        reorder_level,
        preferred_vendor,
        storage_location,
        notes,
        created_at,
        updated_at
      FROM operations_inventory_items
      ORDER BY category ASC, name ASC
    `)
    .all()
    .map(mapInventoryItem);

  return filterRows(rows, viewer, preferredBranchId).map(decorateInventoryItem);
}

export function listFuelTanks(viewer = null, preferredBranchId = "") {
  const rows = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        branch_id,
        asset_name,
        fuel_type,
        capacity_litres,
        current_litres,
        reorder_level_litres,
        average_daily_litres,
        last_dip_at,
        notes,
        created_at,
        updated_at
      FROM operations_fuel_tanks
      ORDER BY fuel_type ASC, asset_name ASC
    `)
    .all()
    .map(mapFuelTank);

  return filterRows(rows, viewer, preferredBranchId).map(decorateFuelTank);
}

export function listFuelLogs(viewer = null, preferredBranchId = "", limit = 40) {
  const rows = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        branch_id,
        tank_id,
        log_type,
        quantity_litres,
        generator_hours,
        reading_at,
        recorded_by_name,
        notes,
        created_at
      FROM operations_fuel_logs
      ORDER BY reading_at DESC, created_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map(mapFuelLog);

  return filterRows(rows, viewer, preferredBranchId);
}

export function listAssets(viewer = null, preferredBranchId = "") {
  const rows = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        branch_id,
        name,
        asset_type,
        location,
        status,
        service_interval_days,
        last_serviced_at,
        next_service_at,
        notes,
        created_at,
        updated_at
      FROM operations_assets
      ORDER BY status ASC, asset_type ASC, name ASC
    `)
    .all()
    .map(mapAsset);

  return filterRows(rows, viewer, preferredBranchId).map(decorateAsset);
}

export function listWorkOrders(viewer = null, preferredBranchId = "") {
  const rows = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        branch_id,
        asset_id,
        title,
        priority,
        status,
        due_at,
        assigned_to,
        vendor,
        notes,
        created_at,
        updated_at
      FROM operations_work_orders
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        due_at ASC
    `)
    .all()
    .map(mapWorkOrder);

  return filterRows(rows, viewer, preferredBranchId).map(decorateWorkOrder);
}

export function listPurchaseRequests(viewer = null, preferredBranchId = "") {
  const rows = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        branch_id,
        title,
        category,
        estimated_amount,
        status,
        needed_by,
        requested_by_name,
        notes,
        created_at,
        updated_at
      FROM operations_purchase_requests
      ORDER BY needed_by ASC, created_at DESC
    `)
    .all()
    .map(mapPurchaseRequest);

  return filterRows(rows, viewer, preferredBranchId).map(decoratePurchaseRequest);
}

export function createInventoryItemEntry(input) {
  const now = new Date().toISOString();
  const id = randomUUID();

  getDatabase()
    .prepare(`
      INSERT INTO operations_inventory_items (
        id,
        organization_id,
        branch_id,
        name,
        category,
        unit,
        quantity,
        reorder_level,
        preferred_vendor,
        storage_location,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.organizationId,
      input.branchId,
      input.name,
      input.category || "General",
      input.unit || "units",
      toNumber(input.quantity),
      toNumber(input.reorderLevel),
      input.preferredVendor || null,
      input.storageLocation || null,
      input.notes || null,
      now,
      now
    );

  return id;
}

export function adjustInventoryItemEntry(itemId, input, viewer = null, preferredBranchId = "") {
  const item = getInventoryItemById(itemId, viewer, preferredBranchId);
  if (!item) {
    throw new Error("Inventory item not found.");
  }

  const nextQuantity =
    input.mode === "set"
      ? toNumber(input.quantity)
      : Math.max(0, toNumber(item.quantity) + toNumber(input.quantity));

  getDatabase()
    .prepare(`
      UPDATE operations_inventory_items
      SET quantity = ?, notes = COALESCE(?, notes), updated_at = ?
      WHERE id = ?
    `)
    .run(nextQuantity, input.notes || null, new Date().toISOString(), itemId);

  return decorateInventoryItem({
    ...item,
    quantity: nextQuantity,
    notes: input.notes || item.notes,
  });
}

export function createFuelTankEntry(input) {
  const now = new Date().toISOString();
  const id = randomUUID();

  getDatabase()
    .prepare(`
      INSERT INTO operations_fuel_tanks (
        id,
        organization_id,
        branch_id,
        asset_name,
        fuel_type,
        capacity_litres,
        current_litres,
        reorder_level_litres,
        average_daily_litres,
        last_dip_at,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.organizationId,
      input.branchId,
      input.assetName,
      input.fuelType || "diesel",
      toNumber(input.capacityLitres),
      toNumber(input.currentLitres),
      toNumber(input.reorderLevelLitres),
      toNumber(input.averageDailyLitres),
      input.lastDipAt || now,
      input.notes || null,
      now,
      now
    );

  return id;
}

export function recordFuelLogEntry(tankId, input, viewer = null, preferredBranchId = "") {
  const tank = getFuelTankById(tankId, viewer, preferredBranchId);
  if (!tank) {
    throw new Error("Fuel tank not found.");
  }

  const quantity = toNumber(input.quantityLitres);
  const logType = input.logType === "usage" ? "usage" : "refill";
  const signedQuantity = logType === "usage" ? -quantity : quantity;
  const nextLevel = Math.max(0, Math.min(tank.capacityLitres, tank.currentLitres + signedQuantity));
  const now = new Date().toISOString();
  const readingAt = input.readingAt || now;
  const id = randomUUID();

  getDatabase()
    .prepare(`
      INSERT INTO operations_fuel_logs (
        id,
        organization_id,
        branch_id,
        tank_id,
        log_type,
        quantity_litres,
        generator_hours,
        reading_at,
        recorded_by_name,
        notes,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      tank.organizationId,
      tank.branchId,
      tank.id,
      logType,
      quantity,
      input.generatorHours ? toNumber(input.generatorHours) : null,
      readingAt,
      input.recordedByName || "Operations",
      input.notes || null,
      now
    );

  getDatabase()
    .prepare(`
      UPDATE operations_fuel_tanks
      SET current_litres = ?, last_dip_at = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(nextLevel, readingAt, now, tank.id);

  return id;
}

export function createAssetEntry(input) {
  const now = new Date().toISOString();
  const id = randomUUID();

  getDatabase()
    .prepare(`
      INSERT INTO operations_assets (
        id,
        organization_id,
        branch_id,
        name,
        asset_type,
        location,
        status,
        service_interval_days,
        last_serviced_at,
        next_service_at,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.organizationId,
      input.branchId,
      input.name,
      input.assetType || "Equipment",
      input.location || null,
      input.status || "active",
      input.serviceIntervalDays ? Math.round(toNumber(input.serviceIntervalDays)) : null,
      input.lastServicedAt || null,
      input.nextServiceAt || null,
      input.notes || null,
      now,
      now
    );

  return id;
}

export function createWorkOrderEntry(input) {
  const now = new Date().toISOString();
  const id = randomUUID();

  getDatabase()
    .prepare(`
      INSERT INTO operations_work_orders (
        id,
        organization_id,
        branch_id,
        asset_id,
        title,
        priority,
        status,
        due_at,
        assigned_to,
        vendor,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.organizationId,
      input.branchId,
      input.assetId || null,
      input.title,
      input.priority || "medium",
      input.status || "open",
      input.dueAt || null,
      input.assignedTo || null,
      input.vendor || null,
      input.notes || null,
      now,
      now
    );

  return id;
}

export function createPurchaseRequestEntry(input) {
  const now = new Date().toISOString();
  const id = randomUUID();

  getDatabase()
    .prepare(`
      INSERT INTO operations_purchase_requests (
        id,
        organization_id,
        branch_id,
        title,
        category,
        estimated_amount,
        status,
        needed_by,
        requested_by_name,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.organizationId,
      input.branchId,
      input.title,
      input.category || "General",
      toNumber(input.estimatedAmount),
      input.status || "requested",
      input.neededBy || null,
      input.requestedByName || "Operations",
      input.notes || null,
      now,
      now
    );

  return id;
}

function getInventoryItemById(itemId, viewer = null, preferredBranchId = "") {
  const row = getDatabase()
    .prepare(`
      SELECT *
      FROM operations_inventory_items
      WHERE id = ?
      LIMIT 1
    `)
    .get(itemId);
  const item = row ? mapInventoryItem(row) : null;

  if (!item || !canAccessRecord(item, viewer, preferredBranchId)) {
    return null;
  }

  return item;
}

function getFuelTankById(tankId, viewer = null, preferredBranchId = "") {
  const row = getDatabase()
    .prepare(`
      SELECT *
      FROM operations_fuel_tanks
      WHERE id = ?
      LIMIT 1
    `)
    .get(tankId);
  const tank = row ? mapFuelTank(row) : null;

  if (!tank || !canAccessRecord(tank, viewer, preferredBranchId)) {
    return null;
  }

  return tank;
}

function buildOperationsSummary({
  inventory,
  fuelTanks,
  assets,
  workOrders,
  purchaseRequests,
  resourceSignals = null,
}) {
  const lowInventory = inventory.filter((item) => item.status !== "steady").length;
  const lowFuel = fuelTanks.filter((tank) => tank.status !== "steady").length;
  const serviceAssets = assets.filter((asset) => asset.serviceStatus !== "steady").length;
  const openWorkOrders = workOrders.filter((order) => order.status !== "completed").length;
  const criticalWorkOrders = workOrders.filter(
    (order) => order.status !== "completed" && order.priority === "critical"
  ).length;
  const requestedPurchases = purchaseRequests.filter(
    (request) => request.status === "requested"
  ).length;
  const pendingPurchases = purchaseRequests.filter((request) =>
    ["requested", "approved", "ordered"].includes(request.status)
  ).length;

  return {
    signals:
      resourceSignals?.length ??
      lowInventory + lowFuel + serviceAssets + criticalWorkOrders + requestedPurchases,
    lowInventory,
    lowFuel,
    openWorkOrders,
    pendingPurchases,
  };
}

function buildResourceSignals({
  inventory,
  fuelTanks,
  assets,
  workOrders,
  purchaseRequests,
}) {
  const inventorySignals = inventory
    .filter((item) => item.status !== "steady")
    .map((item) => ({
      id: `inventory:${item.id}`,
      title: `${item.name} is ${item.status === "critical" ? "critically low" : "below reorder"}`,
      detail: `${formatQuantity(item.quantity)} ${item.unit} available. Reorder at ${formatQuantity(item.reorderLevel)} ${item.unit}.`,
      tone: item.status,
      href: "/operations#inventory",
    }));
  const fuelSignals = fuelTanks
    .filter((tank) => tank.status !== "steady")
    .map((tank) => ({
      id: `fuel:${tank.id}`,
      title: `${capitalize(tank.fuelType)} is running low`,
      detail: `${tank.assetName} has ${formatQuantity(tank.currentLitres)}L left, about ${tank.daysRemainingLabel}.`,
      tone: tank.status,
      href: "/operations#fuel",
    }));
  const maintenanceSignals = assets
    .filter((asset) => asset.serviceStatus !== "steady")
    .map((asset) => ({
      id: `asset:${asset.id}`,
      title: `${asset.name} service ${asset.serviceStatus === "critical" ? "overdue" : "due soon"}`,
      detail: asset.nextServiceAt
        ? `Next service: ${formatDateLabel(asset.nextServiceAt)}.`
        : "No next service date is on record.",
      tone: asset.serviceStatus,
      href: "/operations#assets",
    }));
  const workOrderSignals = workOrders
    .filter((order) => order.status !== "completed" && order.priority === "critical")
    .map((order) => ({
      id: `work:${order.id}`,
      title: order.title,
      detail: order.dueAt
        ? `Critical work order due ${formatDateLabel(order.dueAt)}.`
        : "Critical work order needs scheduling.",
      tone: "critical",
      href: "/operations#maintenance",
    }));
  const purchaseSignals = purchaseRequests
    .filter((request) => request.status === "requested")
    .slice(0, 3)
    .map((request) => ({
      id: `purchase:${request.id}`,
      title: `${request.title} awaiting approval`,
      detail: request.neededBy
        ? `Needed by ${formatDateLabel(request.neededBy)}.`
        : "No needed-by date set.",
      tone: "warning",
      href: "/operations#purchases",
    }));

  return [
    ...fuelSignals,
    ...inventorySignals,
    ...maintenanceSignals,
    ...workOrderSignals,
    ...purchaseSignals,
  ]
    .sort((first, second) => toneRank(first.tone) - toneRank(second.tone))
    .slice(0, 10);
}

function buildBranchOperations({ branches, inventory, fuelTanks, assets, workOrders }) {
  return branches.map((branch) => {
    const branchInventory = inventory.filter((item) => item.branchId === branch.id);
    const branchFuel = fuelTanks.filter((tank) => tank.branchId === branch.id);
    const branchAssets = assets.filter((asset) => asset.branchId === branch.id);
    const branchWorkOrders = workOrders.filter((order) => order.branchId === branch.id);
    const signalCount =
      branchInventory.filter((item) => item.status !== "steady").length +
      branchFuel.filter((tank) => tank.status !== "steady").length +
      branchAssets.filter((asset) => asset.serviceStatus !== "steady").length +
      branchWorkOrders.filter((order) => order.status !== "completed").length;

    return {
      id: branch.id,
      name: branch.name,
      regionName: branch.regionName,
      signalCount,
      lowFuelCount: branchFuel.filter((tank) => tank.status !== "steady").length,
      lowInventoryCount: branchInventory.filter((item) => item.status !== "steady").length,
      openWorkOrders: branchWorkOrders.filter((order) => order.status !== "completed")
        .length,
      assetCount: branchAssets.length,
      health: signalCount >= 4 ? "At risk" : signalCount > 0 ? "Watch" : "Ready",
    };
  });
}

function decorateInventoryItem(item) {
  const ratio = item.reorderLevel > 0 ? item.quantity / item.reorderLevel : 99;
  const status =
    item.quantity <= 0 || ratio <= 0.35
      ? lowStockTone.critical
      : item.quantity <= item.reorderLevel
        ? lowStockTone.warning
        : lowStockTone.steady;

  return {
    ...item,
    status,
    quantityLabel: `${formatQuantity(item.quantity)} ${item.unit}`,
    reorderLabel: `${formatQuantity(item.reorderLevel)} ${item.unit}`,
  };
}

function decorateFuelTank(tank) {
  const percent = tank.capacityLitres
    ? Math.round((tank.currentLitres / tank.capacityLitres) * 100)
    : 0;
  const daysRemaining =
    tank.averageDailyLitres > 0 ? tank.currentLitres / tank.averageDailyLitres : null;
  const status =
    tank.currentLitres <= tank.reorderLevelLitres * 0.35
      ? lowStockTone.critical
      : tank.currentLitres <= tank.reorderLevelLitres
        ? lowStockTone.warning
        : lowStockTone.steady;

  return {
    ...tank,
    status,
    percent,
    daysRemaining,
    daysRemainingLabel:
      daysRemaining === null ? "usage not calibrated" : `${Math.max(1, Math.floor(daysRemaining))} day${Math.floor(daysRemaining) === 1 ? "" : "s"}`,
    levelLabel: `${formatQuantity(tank.currentLitres)}L / ${formatQuantity(tank.capacityLitres)}L`,
  };
}

function decorateAsset(asset) {
  const nextService = asset.nextServiceAt ? new Date(asset.nextServiceAt).valueOf() : null;
  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  const serviceStatus =
    nextService && nextService < now
      ? "critical"
      : nextService && nextService - now <= fourteenDays
        ? "warning"
        : "steady";

  return {
    ...asset,
    serviceStatus,
    nextServiceLabel: asset.nextServiceAt ? formatDateLabel(asset.nextServiceAt) : "Not scheduled",
  };
}

function decorateWorkOrder(order) {
  return {
    ...order,
    dueLabel: order.dueAt ? formatDateLabel(order.dueAt) : "No due date",
  };
}

function decoratePurchaseRequest(request) {
  return {
    ...request,
    neededByLabel: request.neededBy ? formatDateLabel(request.neededBy) : "No due date",
  };
}

function filterRows(rows, viewer = null, preferredBranchId = "") {
  if (!viewer) {
    return rows;
  }

  const scope = buildViewerScope(viewer, preferredBranchId);
  return rows.filter((row) => recordMatchesViewerScope(row, scope));
}

function canAccessRecord(record, viewer = null, preferredBranchId = "") {
  if (!viewer) {
    return true;
  }

  const scope = buildViewerScope(viewer, preferredBranchId);
  return record.organizationId === resolveUserOrganizationId(viewer) && recordMatchesViewerScope(record, scope);
}

function mapInventoryItem(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id || "",
    name: row.name,
    category: row.category || "General",
    unit: row.unit || "units",
    quantity: toNumber(row.quantity),
    reorderLevel: toNumber(row.reorder_level),
    preferredVendor: row.preferred_vendor || "",
    storageLocation: row.storage_location || "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFuelTank(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id || "",
    assetName: row.asset_name,
    fuelType: row.fuel_type || "diesel",
    capacityLitres: toNumber(row.capacity_litres),
    currentLitres: toNumber(row.current_litres),
    reorderLevelLitres: toNumber(row.reorder_level_litres),
    averageDailyLitres: toNumber(row.average_daily_litres),
    lastDipAt: row.last_dip_at || "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFuelLog(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id || "",
    tankId: row.tank_id,
    logType: row.log_type,
    quantityLitres: toNumber(row.quantity_litres),
    generatorHours: row.generator_hours === null ? null : toNumber(row.generator_hours),
    readingAt: row.reading_at,
    recordedByName: row.recorded_by_name || "",
    notes: row.notes || "",
    createdAt: row.created_at,
  };
}

function mapAsset(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id || "",
    name: row.name,
    assetType: row.asset_type || "Equipment",
    location: row.location || "",
    status: row.status || "active",
    serviceIntervalDays:
      row.service_interval_days === null ? null : Number(row.service_interval_days),
    lastServicedAt: row.last_serviced_at || "",
    nextServiceAt: row.next_service_at || "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWorkOrder(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id || "",
    assetId: row.asset_id || "",
    title: row.title,
    priority: row.priority || "medium",
    status: row.status || "open",
    dueAt: row.due_at || "",
    assignedTo: row.assigned_to || "",
    vendor: row.vendor || "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPurchaseRequest(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id || "",
    title: row.title,
    category: row.category || "General",
    estimatedAmount: toNumber(row.estimated_amount),
    status: row.status || "requested",
    neededBy: row.needed_by || "",
    requestedByName: row.requested_by_name || "",
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toneRank(tone) {
  return tone === "critical" ? 0 : tone === "warning" ? 1 : 2;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function formatQuantity(value) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "Not scheduled";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function capitalize(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
