import {
  defaultPrimaryBranchId,
  defaultPrimaryOrganizationId,
} from "@/lib/organization-defaults";

export const WORKSPACE_BRANCH_COOKIE = "cco-workspace-branch";
export const PUBLIC_ORGANIZATION_COOKIE = "cco-public-organization";
export const PUBLIC_BRANCH_COOKIE = "cco-public-branch";

export function normalizeAccessScope(value) {
  return value === "organization" ? "organization" : "branch";
}

export function normalizeManagedBranchIds(value, fallbackBranchId = "") {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(String).filter(Boolean)));
  }

  if (typeof value === "string" && value.trim()) {
    return Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  return fallbackBranchId ? [fallbackBranchId] : [];
}

export function isOrganizationScopedUser(user) {
  return normalizeAccessScope(user?.accessScope) === "organization";
}

export function resolveUserOrganizationId(user) {
  return user?.organizationId || defaultPrimaryOrganizationId;
}

export function resolveUserBranchId(user) {
  return user?.branchId || defaultPrimaryBranchId;
}

export function getUserManagedBranchIds(user) {
  return normalizeManagedBranchIds(user?.managedBranchIds, resolveUserBranchId(user));
}

export function canUserAccessBranch(user, branch) {
  if (!user || !branch) {
    return false;
  }

  if (resolveUserOrganizationId(user) !== branch.organizationId) {
    return false;
  }

  if (isOrganizationScopedUser(user)) {
    const managed = getUserManagedBranchIds(user);
    return managed.length === 0 || managed.includes(branch.id);
  }

  return resolveUserBranchId(user) === branch.id;
}

export function buildViewerScope(user, activeBranchId = "") {
  const organizationId = resolveUserOrganizationId(user);
  const branchId = resolveUserBranchId(user);
  const accessScope = normalizeAccessScope(user?.accessScope);
  const managedBranchIds = getUserManagedBranchIds(user);

  if (accessScope === "organization") {
    return {
      organizationId,
      accessScope,
      branchIds: managedBranchIds,
      activeBranchId: activeBranchId || "",
    };
  }

  return {
    organizationId,
    accessScope: "branch",
    branchIds: branchId ? [branchId] : [],
    activeBranchId: branchId,
  };
}

export function recordMatchesViewerScope(record, viewerScope) {
  if (!record || !viewerScope) {
    return false;
  }

  if (record.organizationId !== viewerScope.organizationId) {
    return false;
  }

  if (viewerScope.accessScope === "organization") {
    if (!record.branchId) {
      return !viewerScope.activeBranchId;
    }

    if (viewerScope.branchIds?.length > 0 && !viewerScope.branchIds.includes(record.branchId)) {
      return false;
    }

    if (viewerScope.activeBranchId && record.branchId !== viewerScope.activeBranchId) {
      return false;
    }

    return true;
  }

  return record.branchId === viewerScope.activeBranchId;
}
