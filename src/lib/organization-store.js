import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";
import { listUsers } from "@/lib/auth-store";
import { formatDateTime, formatShortDateTime } from "@/lib/care-format";
import {
  defaultBranchSettings,
  defaultBranches,
  defaultChurchSettings,
  defaultOrganizations,
  defaultPrimaryBranchId,
  defaultPrimaryOrganizationId,
  defaultRegions,
} from "@/lib/organization-defaults";
import { getDashboardData, getOperationsSnapshot, listAuditLogs } from "@/lib/care-store";
import { getDatabase, parseJson, serializeJson } from "@/lib/database";
import { getJobSnapshot, listJobs } from "@/lib/job-store";
import { listMemberTransfers } from "@/lib/member-transfer-store";
import {
  buildViewerScope,
  canUserAccessBranch,
  getUserManagedBranchIds,
  isOrganizationScopedUser,
  recordMatchesViewerScope,
  resolveUserBranchId,
  resolveUserOrganizationId,
} from "@/lib/workspace-scope";

function listOrganizationsInternal() {
  return getDatabase()
    .prepare(`
      SELECT
        id,
        slug,
        name,
        short_name,
        support_email,
        support_phone,
        headquarters_city,
        country,
        active,
        created_at
      FROM organizations
      WHERE active = 1
      ORDER BY name ASC
    `)
    .all()
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      shortName: row.short_name || row.name,
      supportEmail: row.support_email || "",
      supportPhone: row.support_phone || "",
      headquartersCity: row.headquarters_city || "",
      country: row.country || "",
      active: row.active === 1,
      createdAt: row.created_at,
    }));
}

function listBranchesInternal(organizationId = "") {
  const rows = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        region_id,
        slug,
        code,
        name,
        city,
        state,
        country,
        pastor_name,
        support_email,
        support_phone,
        is_headquarters,
        active,
        created_at,
        updated_at
      FROM branches
      WHERE active = 1
      ORDER BY is_headquarters DESC, name ASC
    `)
    .all();

  return rows
      .map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        regionId: row.region_id || "",
        slug: row.slug,
      code: row.code,
      name: row.name,
      city: row.city || "",
      state: row.state || "",
      country: row.country || "",
      pastorName: row.pastor_name || "",
      supportEmail: row.support_email || "",
      supportPhone: row.support_phone || "",
      isHeadquarters: row.is_headquarters === 1,
      active: row.active === 1,
      createdAt: row.created_at,
        updatedAt: row.updated_at,
        locationLabel: [row.city, row.state].filter(Boolean).join(", "),
      }))
    .filter((branch) =>
      organizationId ? branch.organizationId === organizationId : true
    );
}

function listRegionsInternal(organizationId = "") {
  const rows = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        slug,
        code,
        name,
        description,
        lead_name,
        active,
        created_at,
        updated_at
      FROM regions
      WHERE active = 1
      ORDER BY name ASC
    `)
    .all();
  const branches = listBranchesInternal();

  return rows
    .map((row) => {
      const regionBranches = branches.filter((branch) => branch.regionId === row.id);
      return {
        id: row.id,
        organizationId: row.organization_id,
        slug: row.slug,
        code: row.code,
        name: row.name,
        description: row.description || "",
        leadName: row.lead_name || "",
        active: row.active === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        branchCount: regionBranches.length,
        branchIds: regionBranches.map((branch) => branch.id),
      };
    })
    .filter((region) =>
      organizationId ? region.organizationId === organizationId : true
    );
}

function resolveOrganization(organizationId = defaultPrimaryOrganizationId) {
  return (
    listOrganizationsInternal().find(
      (organization) => organization.id === organizationId
    ) ||
    defaultOrganizations.find((organization) => organization.id === organizationId) ||
    defaultOrganizations[0]
  );
}

function resolveBranch(branchId = defaultPrimaryBranchId) {
  return (
    listBranchesInternal().find((branch) => branch.id === branchId) ||
    defaultBranches.find((branch) => branch.id === branchId) ||
    defaultBranches[0]
  );
}

function resolveRegion(regionId = "") {
  return (
    listRegionsInternal().find((region) => region.id === regionId) ||
    defaultRegions.find((region) => region.id === regionId) ||
    null
  );
}

function filterByViewerScope(items, viewer = null, preferredBranchId = "") {
  if (!viewer) {
    return items;
  }

  const scope = buildViewerScope(viewer, preferredBranchId);

  return items.filter((item) => {
    if (item.organizationId !== scope.organizationId) {
      return false;
    }

    if (scope.accessScope === "organization") {
      if (scope.branchIds?.length > 0 && !scope.branchIds.includes(item.branchId)) {
        return false;
      }

      if (scope.activeBranchId && item.branchId !== scope.activeBranchId) {
        return false;
      }

      return true;
    }

    return item.branchId === scope.activeBranchId;
  });
}

export const listOrganizations = cache(function listOrganizations() {
  return listOrganizationsInternal();
});

export const listBranches = cache(function listBranches(organizationId) {
  return listBranchesInternal(organizationId);
});

export const listRegions = cache(function listRegions(organizationId) {
  return listRegionsInternal(organizationId);
});

export const getBranchOverview = cache(function getBranchOverview(
  viewer = null,
  preferredBranchId = ""
) {
  const organizations = listOrganizationsInternal();
  const branches = filterByViewerScope(listBranchesInternal(), viewer, preferredBranchId);
  const regions = listRegionsInternal();
  const dashboard = buildViewerScope(viewer, preferredBranchId);
  const requestRows = getDatabase()
    .prepare(`
      SELECT organization_id, branch_id, status
      FROM requests
    `)
    .all()
    .map((row) => ({
      organizationId: row.organization_id,
      branchId: row.branch_id,
      status: row.status,
    }))
    .filter((row) => (viewer ? recordMatchesViewerScope(row, dashboard) : true));
  const householdRows = getDatabase()
    .prepare(`
      SELECT organization_id, branch_id, risk
      FROM households
    `)
    .all()
    .map((row) => ({
      organizationId: row.organization_id,
      branchId: row.branch_id,
      risk: row.risk,
    }))
    .filter((row) => (viewer ? recordMatchesViewerScope(row, dashboard) : true));

  return branches.map((branch) => {
    const organization =
      organizations.find((item) => item.id === branch.organizationId) ||
      resolveOrganization(branch.organizationId);
    const branchRequests = requestRows.filter((row) => row.branchId === branch.id);
    const branchHouseholds = householdRows.filter((row) => row.branchId === branch.id);

    return {
      ...branch,
      organizationName: organization.name,
      regionName:
        regions.find((item) => item.id === branch.regionId)?.name || "Unassigned region",
      openRequestCount: branchRequests.filter((row) => row.status === "Open").length,
      closedRequestCount: branchRequests.filter((row) => row.status === "Closed").length,
      urgentHouseholdCount: branchHouseholds.filter((row) => row.risk === "urgent").length,
      watchHouseholdCount: branchHouseholds.filter((row) => row.risk === "watch").length,
    };
  });
});

export const getWorkspaceContext = cache(function getWorkspaceContext(
  user,
  preferredBranchId = ""
) {
  const organizationId = resolveUserOrganizationId(user);
  const organization = resolveOrganization(organizationId);
  const visibleBranches = listBranchesInternal(organizationId).filter((branch) =>
    canUserAccessBranch(user, branch)
  );
  const branchFocusAllowed =
    preferredBranchId &&
    visibleBranches.some((branch) => branch.id === preferredBranchId);
  const activeBranch = isOrganizationScopedUser(user)
    ? branchFocusAllowed
      ? visibleBranches.find((branch) => branch.id === preferredBranchId)
      : null
    : visibleBranches.find((branch) => branch.id === resolveUserBranchId(user)) ||
      visibleBranches[0] ||
      null;

  return {
    organization,
    visibleBranches,
    managedBranchIds: getUserManagedBranchIds(user),
    canSwitchBranches: isOrganizationScopedUser(user) && visibleBranches.length > 1,
    activeBranch,
    activeScopeLabel: activeBranch
      ? activeBranch.name
      : isOrganizationScopedUser(user)
        ? "All branches"
        : visibleBranches[0]?.name || organization.name,
    viewerScope: buildViewerScope(user, activeBranch?.id || ""),
  };
});

export const getPublicWorkspaceCatalog = cache(function getPublicWorkspaceCatalog() {
  const organizations = listOrganizationsInternal();
  const branches = listBranchesInternal();

  return organizations.map((organization) => ({
    ...organization,
    branches: branches.filter((branch) => branch.organizationId === organization.id),
  }));
});

export const getChurchSettings = cache(function getChurchSettings(
  organizationId = defaultPrimaryOrganizationId
) {
  const row = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        church_name,
        campus_name,
        support_email,
        support_phone,
        timezone,
        intake_confirmation_text,
        emergency_banner,
        plan_name,
        billing_contact_email,
        monthly_seat_allowance,
        next_renewal_date,
        backup_expectation,
        email_delivery_mode,
        email_provider,
        email_from_name,
        email_from_address,
        email_reply_to,
        email_subject_prefix,
        message_delivery_mode,
        message_provider,
        sms_from_number,
        whatsapp_from_number,
        notification_channels_json,
        updated_at
      FROM church_settings
      WHERE organization_id = ?
      LIMIT 1
    `)
    .get(organizationId);

  if (!row) {
    const organization = resolveOrganization(organizationId);
    return {
      id: `settings-${organization.id}`,
      organizationId: organization.id,
      churchName: organization.name,
      campusName: resolveBranch(defaultPrimaryBranchId).name,
      supportEmail: organization.supportEmail || defaultChurchSettings.supportEmail,
      supportPhone: organization.supportPhone || defaultChurchSettings.supportPhone,
      timezone: defaultChurchSettings.timezone,
      intakeConfirmationText: defaultChurchSettings.intakeConfirmationText,
      emergencyBanner: defaultChurchSettings.emergencyBanner,
      planName: defaultChurchSettings.planName,
      billingContactEmail:
        organization.supportEmail || defaultChurchSettings.billingContactEmail,
      monthlySeatAllowance: defaultChurchSettings.monthlySeatAllowance,
      nextRenewalDate: defaultChurchSettings.nextRenewalDate,
      backupExpectation: defaultChurchSettings.backupExpectation,
      emailDeliveryMode: defaultChurchSettings.emailDeliveryMode,
      emailProvider: defaultChurchSettings.emailProvider,
      emailFromName: `${organization.name} Care Office`,
      emailFromAddress:
        organization.supportEmail || defaultChurchSettings.emailFromAddress,
      emailReplyTo: organization.supportEmail || defaultChurchSettings.emailReplyTo,
      emailSubjectPrefix: organization.name,
      messageDeliveryMode: defaultChurchSettings.messageDeliveryMode,
      messageProvider: defaultChurchSettings.messageProvider,
      smsFromNumber: defaultChurchSettings.smsFromNumber,
      whatsappFromNumber: defaultChurchSettings.whatsappFromNumber,
      notificationChannels: defaultChurchSettings.notificationChannels,
      updatedAt: "",
      updatedLabel: "",
      renewalLabel: formatDateTime(defaultChurchSettings.nextRenewalDate),
    };
  }

  return {
    id: row.id,
    organizationId: row.organization_id,
    churchName: row.church_name,
    campusName: row.campus_name || "",
    supportEmail: row.support_email || "",
    supportPhone: row.support_phone || "",
    timezone: row.timezone,
    intakeConfirmationText: row.intake_confirmation_text,
    emergencyBanner: row.emergency_banner,
    planName: row.plan_name,
    billingContactEmail: row.billing_contact_email || "",
    monthlySeatAllowance: row.monthly_seat_allowance || "",
    nextRenewalDate: row.next_renewal_date || "",
    backupExpectation: row.backup_expectation || "",
    emailDeliveryMode:
      row.email_delivery_mode || defaultChurchSettings.emailDeliveryMode,
    emailProvider: row.email_provider || defaultChurchSettings.emailProvider,
    emailFromName: row.email_from_name || defaultChurchSettings.emailFromName,
    emailFromAddress:
      row.email_from_address ||
      row.support_email ||
      defaultChurchSettings.emailFromAddress,
    emailReplyTo:
      row.email_reply_to || row.support_email || defaultChurchSettings.emailReplyTo,
    emailSubjectPrefix:
      row.email_subject_prefix || defaultChurchSettings.emailSubjectPrefix,
    messageDeliveryMode:
      row.message_delivery_mode || defaultChurchSettings.messageDeliveryMode,
    messageProvider:
      row.message_provider || defaultChurchSettings.messageProvider,
    smsFromNumber:
      row.sms_from_number || defaultChurchSettings.smsFromNumber,
    whatsappFromNumber:
      row.whatsapp_from_number || defaultChurchSettings.whatsappFromNumber,
    notificationChannels: parseJson(row.notification_channels_json, []),
    updatedAt: row.updated_at,
    updatedLabel: formatDateTime(row.updated_at),
    renewalLabel: formatDateTime(row.next_renewal_date),
  };
});

export const getBranchSettings = cache(function getBranchSettings(branchId = "") {
  if (!branchId) {
    return null;
  }

  const row = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        branch_id,
        support_email,
        support_phone,
        intake_confirmation_text,
        emergency_banner,
        public_intro,
        follow_up_guidance,
        email_from_name,
        email_from_address,
        email_reply_to,
        sms_from_number,
        whatsapp_from_number,
        updated_at
      FROM branch_settings
      WHERE branch_id = ?
      LIMIT 1
    `)
    .get(branchId);
  const branch = resolveBranch(branchId);
  const defaults =
    defaultBranchSettings.find((item) => item.branchId === branchId) || null;

  if (!row && !defaults) {
    return null;
  }

  return {
    id: row?.id || defaults?.id || `branch-settings-${branchId}`,
    organizationId: row?.organization_id || defaults?.organizationId || branch.organizationId,
    branchId: row?.branch_id || defaults?.branchId || branchId,
    supportEmail: row?.support_email || defaults?.supportEmail || "",
    supportPhone: row?.support_phone || defaults?.supportPhone || "",
    intakeConfirmationText:
      row?.intake_confirmation_text || defaults?.intakeConfirmationText || "",
    emergencyBanner: row?.emergency_banner || defaults?.emergencyBanner || "",
    publicIntro: row?.public_intro || defaults?.publicIntro || "",
    followUpGuidance: row?.follow_up_guidance || defaults?.followUpGuidance || "",
    emailFromName: row?.email_from_name || defaults?.emailFromName || "",
    emailFromAddress: row?.email_from_address || defaults?.emailFromAddress || "",
    emailReplyTo: row?.email_reply_to || defaults?.emailReplyTo || "",
    smsFromNumber: row?.sms_from_number || defaults?.smsFromNumber || "",
    whatsappFromNumber:
      row?.whatsapp_from_number || defaults?.whatsappFromNumber || "",
    updatedAt: row?.updated_at || "",
  };
});

export const getEffectiveChurchSettings = cache(function getEffectiveChurchSettings(
  organizationId = defaultPrimaryOrganizationId,
  branchId = ""
) {
  const orgSettings = getChurchSettings(organizationId);
  const branchSettings = getBranchSettings(branchId);
  const branch = branchId ? resolveBranch(branchId) : null;

  if (!branchSettings) {
    return {
      ...orgSettings,
      branchId: branch?.id || "",
      branchName: branch?.name || "",
      publicIntro:
        `Share what is happening privately with ${orgSettings.campusName || orgSettings.churchName}. A pastor or care leader will guide the next safe step with you.`,
      followUpGuidance:
        "Care teams review urgent requests first and then set a clear next-touch plan for every open household.",
    };
  }

  return {
    ...orgSettings,
    branchId: branch?.id || branchSettings.branchId,
    branchName: branch?.name || "",
    supportEmail: branchSettings.supportEmail || orgSettings.supportEmail,
    supportPhone: branchSettings.supportPhone || orgSettings.supportPhone,
    intakeConfirmationText:
      branchSettings.intakeConfirmationText || orgSettings.intakeConfirmationText,
    emergencyBanner: branchSettings.emergencyBanner || orgSettings.emergencyBanner,
    publicIntro:
      branchSettings.publicIntro ||
      `Share what is happening privately with ${branch?.name || orgSettings.churchName}. A pastor or care leader will guide the next safe step with you.`,
    followUpGuidance:
      branchSettings.followUpGuidance ||
      "Care teams review urgent requests first and then set a clear next-touch plan for every open household.",
    emailFromName: branchSettings.emailFromName || orgSettings.emailFromName,
    emailFromAddress:
      branchSettings.emailFromAddress || orgSettings.emailFromAddress,
    emailReplyTo: branchSettings.emailReplyTo || orgSettings.emailReplyTo,
    smsFromNumber: branchSettings.smsFromNumber || orgSettings.smsFromNumber,
    whatsappFromNumber:
      branchSettings.whatsappFromNumber || orgSettings.whatsappFromNumber,
  };
});

export function updateChurchSettingsEntry(input) {
  const now = new Date().toISOString();
  const organizationId = input.organizationId || defaultPrimaryOrganizationId;
  const current = getChurchSettings(organizationId);

  if (!current) {
    throw new Error("Church settings are not available.");
  }

  getDatabase()
    .prepare(`
      UPDATE church_settings
      SET
        church_name = ?,
        campus_name = ?,
        support_email = ?,
        support_phone = ?,
        timezone = ?,
        intake_confirmation_text = ?,
        emergency_banner = ?,
        plan_name = ?,
        billing_contact_email = ?,
        monthly_seat_allowance = ?,
        next_renewal_date = ?,
        backup_expectation = ?,
        email_delivery_mode = ?,
        email_provider = ?,
        email_from_name = ?,
        email_from_address = ?,
        email_reply_to = ?,
        email_subject_prefix = ?,
        message_delivery_mode = ?,
        message_provider = ?,
        sms_from_number = ?,
        whatsapp_from_number = ?,
        notification_channels_json = ?,
        updated_at = ?
      WHERE organization_id = ?
    `)
    .run(
      input.churchName || current.churchName,
      input.campusName || "",
      input.supportEmail || "",
      input.supportPhone || "",
      input.timezone || current.timezone,
      input.intakeConfirmationText || current.intakeConfirmationText,
      input.emergencyBanner || current.emergencyBanner,
      input.planName || current.planName,
      input.billingContactEmail || "",
      input.monthlySeatAllowance || "",
      input.nextRenewalDate || "",
      input.backupExpectation || "",
      input.emailDeliveryMode || current.emailDeliveryMode,
      input.emailProvider || current.emailProvider,
      input.emailFromName || current.emailFromName,
      input.emailFromAddress || current.emailFromAddress,
      input.emailReplyTo || current.emailReplyTo,
      input.emailSubjectPrefix || current.emailSubjectPrefix,
      input.messageDeliveryMode || current.messageDeliveryMode,
      input.messageProvider || current.messageProvider,
      input.smsFromNumber || current.smsFromNumber,
      input.whatsappFromNumber || current.whatsappFromNumber,
      serializeJson(input.notificationChannels || []),
      now,
      organizationId
    );
}

export function updateBranchSettingsEntry(input) {
  const now = new Date().toISOString();
  const existing = getBranchSettings(input.branchId);

  if (existing) {
    getDatabase()
      .prepare(`
        UPDATE branch_settings
        SET
          support_email = ?,
          support_phone = ?,
          intake_confirmation_text = ?,
          emergency_banner = ?,
          public_intro = ?,
          follow_up_guidance = ?,
          email_from_name = ?,
          email_from_address = ?,
          email_reply_to = ?,
          sms_from_number = ?,
          whatsapp_from_number = ?,
          updated_at = ?
        WHERE branch_id = ?
      `)
      .run(
        input.supportEmail || "",
        input.supportPhone || "",
        input.intakeConfirmationText || "",
        input.emergencyBanner || "",
        input.publicIntro || "",
        input.followUpGuidance || "",
        input.emailFromName || "",
        input.emailFromAddress || "",
        input.emailReplyTo || "",
        input.smsFromNumber || "",
        input.whatsappFromNumber || "",
        now,
        input.branchId
      );
    return;
  }

  getDatabase()
    .prepare(`
      INSERT INTO branch_settings (
        id, organization_id, branch_id, support_email, support_phone,
        intake_confirmation_text, emergency_banner, public_intro, follow_up_guidance,
        email_from_name, email_from_address, email_reply_to, sms_from_number,
        whatsapp_from_number, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      randomUUID(),
      input.organizationId || defaultPrimaryOrganizationId,
      input.branchId,
      input.supportEmail || "",
      input.supportPhone || "",
      input.intakeConfirmationText || "",
      input.emergencyBanner || "",
      input.publicIntro || "",
      input.followUpGuidance || "",
      input.emailFromName || "",
      input.emailFromAddress || "",
      input.emailReplyTo || "",
      input.smsFromNumber || "",
      input.whatsappFromNumber || "",
      now
    );
}

export const listMinistryTeams = cache(function listMinistryTeams(
  viewer = null,
  preferredBranchId = ""
) {
  const db = getDatabase();
  const teamRows = db.prepare(`
    SELECT
      id,
      organization_id,
      branch_id,
      name,
      lane,
      description,
      lead_name,
      contact_email,
      active,
      capabilities_json,
      created_at,
      updated_at
    FROM teams
    ORDER BY active DESC, name ASC
  `).all();
  const users = viewer
    ? listUsers({ organizationId: resolveUserOrganizationId(viewer) })
    : listUsers();
  const requestRows = db.prepare(`
    SELECT owner, status, assigned_volunteer_json, organization_id, branch_id
    FROM requests
  `).all();

  const teams = teamRows.map((row) => {
    const volunteers = users.filter(
      (user) =>
        user.active &&
        user.role === "volunteer" &&
        user.organizationId === row.organization_id &&
        user.branchId === (row.branch_id || "") &&
        user.lane === row.lane
    );
    const leaders = users.filter(
      (user) =>
        user.active &&
        user.role === "leader" &&
        user.organizationId === row.organization_id &&
        user.branchId === (row.branch_id || "") &&
        user.lane === row.lane
    );
    const openRequestCount = requestRows.filter(
      (request) =>
        request.organization_id === row.organization_id &&
        request.branch_id === row.branch_id &&
        request.status === "Open" &&
        (request.owner === row.lane || request.owner === row.name)
    ).length;
    const assignedTaskCount = requestRows.filter((request) => {
      if (request.status !== "Open" || !request.assigned_volunteer_json) {
        return false;
      }

      const assignment = parseJson(request.assigned_volunteer_json, null);
      return volunteers.some((volunteer) => volunteer.volunteerName === assignment?.name);
    }).length;

    return {
      id: row.id,
      organizationId: row.organization_id,
      branchId: row.branch_id || "",
      name: row.name,
      lane: row.lane,
      description: row.description,
      leadName: row.lead_name,
      contactEmail: row.contact_email || "",
      active: row.active === 1,
      capabilities: parseJson(row.capabilities_json, []),
      volunteerCount: volunteers.length,
      leaderCount: leaders.length,
      openRequestCount,
      assignedTaskCount,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      updatedLabel: formatDateTime(row.updated_at),
      volunteers,
      leaders,
      loadLabel:
        openRequestCount === 0
          ? "Quiet right now"
          : `${openRequestCount} live case${openRequestCount === 1 ? "" : "s"}`,
    };
  });

  return filterByViewerScope(teams, viewer, preferredBranchId);
});

export function createRegionEntry(input) {
  const now = new Date().toISOString();
  getDatabase()
    .prepare(`
      INSERT INTO regions (
        id, organization_id, slug, code, name, description, lead_name, active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      randomUUID(),
      input.organizationId || defaultPrimaryOrganizationId,
      input.slug,
      input.code,
      input.name,
      input.description || null,
      input.leadName || null,
      input.active === false ? 0 : 1,
      now,
      now
    );
}

export function updateRegionEntry(regionId, input) {
  const existing = resolveRegion(regionId);
  if (!existing) {
    throw new Error("Region not found.");
  }

  getDatabase()
    .prepare(`
      UPDATE regions
      SET
        slug = ?,
        code = ?,
        name = ?,
        description = ?,
        lead_name = ?,
        active = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(
      input.slug || existing.slug,
      input.code || existing.code,
      input.name || existing.name,
      input.description ?? existing.description ?? null,
      input.leadName ?? existing.leadName ?? null,
      input.active === undefined ? (existing.active ? 1 : 0) : input.active ? 1 : 0,
      new Date().toISOString(),
      regionId
    );
}

export function createMinistryTeamEntry(input) {
  const now = new Date().toISOString();

  getDatabase()
    .prepare(`
      INSERT INTO teams (
        id, organization_id, branch_id, name, lane, description, lead_name,
        contact_email, active, capabilities_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      randomUUID(),
      input.organizationId || defaultPrimaryOrganizationId,
      input.branchId || defaultPrimaryBranchId,
      input.name,
      input.lane,
      input.description,
      input.leadName,
      input.contactEmail || null,
      input.active === false ? 0 : 1,
      serializeJson(input.capabilities || []),
      now,
      now
    );
}

export function updateMinistryTeamEntry(teamId, input) {
  const existing = listMinistryTeams().find((team) => team.id === teamId);
  if (!existing) {
    throw new Error("Team not found.");
  }

  const now = new Date().toISOString();
  getDatabase()
    .prepare(`
      UPDATE teams
      SET
        name = ?,
        lane = ?,
        description = ?,
        lead_name = ?,
        contact_email = ?,
        active = ?,
        capabilities_json = ?,
        branch_id = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(
      input.name || existing.name,
      input.lane || existing.lane,
      input.description || existing.description,
      input.leadName || existing.leadName,
      input.contactEmail || null,
      input.active === undefined ? (existing.active ? 1 : 0) : input.active ? 1 : 0,
      serializeJson(input.capabilities || existing.capabilities),
      input.branchId || existing.branchId || null,
      now,
      teamId
    );
}

export const listRecoveryRequests = cache(function listRecoveryRequests(
  viewer = null,
  preferredBranchId = ""
) {
  const requests = getDatabase()
    .prepare(`
      SELECT
        id,
        organization_id,
        branch_id,
        email,
        requester_name,
        note,
        status,
        requested_at,
        handled_at,
        handled_by,
        resolution_note
      FROM recovery_requests
      ORDER BY
        CASE status
          WHEN 'open' THEN 0
          WHEN 'issued' THEN 1
          ELSE 2
        END,
        requested_at DESC
    `)
    .all()
    .map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      branchId: row.branch_id || "",
      email: row.email,
      requesterName: row.requester_name || "",
      note: row.note || "",
      status: row.status,
      requestedAt: row.requested_at,
      handledAt: row.handled_at || "",
      handledBy: row.handled_by || "",
      resolutionNote: row.resolution_note || "",
      requestedLabel: formatDateTime(row.requested_at),
      handledLabel: formatDateTime(row.handled_at),
    }));

  return filterByViewerScope(requests, viewer, preferredBranchId);
});

export function createRecoveryRequestEntry(input) {
  const id = randomUUID();

  getDatabase()
    .prepare(`
      INSERT INTO recovery_requests (
        id, organization_id, branch_id, email, requester_name, note, status, requested_at,
        handled_at, handled_by, resolution_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      input.organizationId || defaultPrimaryOrganizationId,
      input.branchId || defaultPrimaryBranchId,
      input.email.trim().toLowerCase(),
      input.requesterName || null,
      input.note || null,
      "open",
      new Date().toISOString(),
      null,
      null,
      null
    );

  return id;
}

export function resolveRecoveryRequestEntry(requestId, input) {
  const now = new Date().toISOString();

  getDatabase()
    .prepare(`
      UPDATE recovery_requests
      SET
        status = ?,
        handled_at = ?,
        handled_by = ?,
        resolution_note = ?
      WHERE id = ?
    `)
    .run(
      input.status || "resolved",
      now,
      input.handledBy || "Care admin",
      input.resolutionNote || "",
      requestId
    );
}

export const listVolunteerRoster = cache(function listVolunteerRoster(
  viewer = null,
  preferredBranchId = ""
) {
  const db = getDatabase();
  const users = viewer
    ? listUsers({ organizationId: resolveUserOrganizationId(viewer) })
    : listUsers();
  const requestRows = db.prepare(`
    SELECT assigned_volunteer_json, status, organization_id, branch_id
    FROM requests
  `).all();
  const rosterMap = new Map();

  for (const user of users) {
    if (user.role !== "volunteer") {
      continue;
    }

    const volunteerName = user.volunteerName || user.name;
    rosterMap.set(volunteerName, {
      name: volunteerName,
      team: user.lane || "General care volunteers",
      email: user.email,
      organizationId: user.organizationId,
      branchId: user.branchId,
      lane: user.lane || "",
      active: user.active,
      activeCount: 0,
      title: user.title || "",
    });
  }

  for (const row of requestRows) {
    const assignment = parseJson(row.assigned_volunteer_json, null);
    if (!assignment?.name) {
      continue;
    }

    const existing = rosterMap.get(assignment.name) || {
      name: assignment.name,
      team: "Volunteer roster",
      email: "",
      organizationId: row.organization_id,
      branchId: row.branch_id || "",
      lane: "",
      active: true,
      activeCount: 0,
      title: "",
    };

    if (row.status === "Open") {
      existing.activeCount += 1;
    }

    rosterMap.set(assignment.name, existing);
  }

  return filterByViewerScope(
    [...rosterMap.values()].sort((first, second) =>
      first.name.localeCompare(second.name)
    ),
    viewer,
    preferredBranchId
  );
});

function buildRequestTrend(requests) {
  const buckets = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = 6; index >= 0; index -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - index);
    const key = day.toISOString().slice(0, 10);
    buckets.set(key, {
      key,
      label: day.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
      }),
      count: 0,
    });
  }

  for (const request of requests) {
    const key = String(request.createdAt || "").slice(0, 10);
    if (buckets.has(key)) {
      buckets.get(key).count += 1;
    }
  }

  return [...buckets.values()];
}

function buildOwnerLoad(households) {
  const counts = households.reduce((result, household) => {
    const owner = household.owner || "Unassigned";
    result[owner] = (result[owner] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((first, second) => second.count - first.count);
}

function buildSourceMix(requests) {
  const counts = requests.reduce((result, request) => {
    const source = request.source || "Unknown";
    result[source] = (result[source] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((first, second) => second.count - first.count);
}

function buildAgingBuckets(requests) {
  const now = Date.now();
  const counts = {
    Overdue: 0,
    "Due today": 0,
    "1-3 days": 0,
    "4+ days": 0,
  };

  for (const request of requests.filter((item) => item.status === "Open")) {
    const dueAt = new Date(request.dueAt).valueOf();
    if (Number.isNaN(dueAt)) {
      counts["4+ days"] += 1;
      continue;
    }

    const diffDays = Math.floor((dueAt - now) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) {
      counts.Overdue += 1;
    } else if (diffDays === 0) {
      counts["Due today"] += 1;
    } else if (diffDays <= 3) {
      counts["1-3 days"] += 1;
    } else {
      counts["4+ days"] += 1;
    }
  }

  return Object.entries(counts).map(([label, count]) => ({ label, count }));
}

export async function getOperationalReportData(viewer = null, preferredBranchId = "") {
  const organizationId = viewer
    ? resolveUserOrganizationId(viewer)
    : defaultPrimaryOrganizationId;
  const [dashboard, settings] = await Promise.all([
    getDashboardData(viewer, preferredBranchId),
    Promise.resolve(getEffectiveChurchSettings(organizationId, preferredBranchId)),
  ]);
  const users = viewer
    ? listUsers({ organizationId })
    : listUsers();
  const teams = listMinistryTeams(viewer, preferredBranchId);
  const audits = listAuditLogs(40, viewer, preferredBranchId);
  const branches = getBranchOverview(viewer, preferredBranchId);
  const transfers = listMemberTransfers(viewer, preferredBranchId);
  const regions = listRegionsInternal(organizationId);
  const now = new Date();
  const overdueFollowUps = dashboard.households.filter((household) => {
    const due = new Date(household.nextTouchpoint);
    return !Number.isNaN(due.valueOf()) && due.valueOf() < now.valueOf();
  });
  const needs = dashboard.requests.reduce((result, request) => {
    result[request.need] = (result[request.need] ?? 0) + 1;
    return result;
  }, {});
  const stages = dashboard.households.reduce((result, household) => {
    result[household.stage] = (result[household.stage] ?? 0) + 1;
    return result;
  }, {});
  const regionBreakdown = regions
    .map((region) => {
      const branchIds = branches
        .filter((branch) => branch.regionId === region.id)
        .map((branch) => branch.id);
      const openCount = dashboard.openRequests.filter((request) =>
        branchIds.includes(request.branchId)
      ).length;
      const urgentCount = dashboard.households.filter(
        (household) =>
          branchIds.includes(household.branchId) && household.risk === "urgent"
      ).length;

      return {
        id: region.id,
        label: region.name,
        count: openCount,
        urgentCount,
        branchCount: branchIds.length,
      };
    })
    .filter((region) => region.branchCount > 0 || region.count > 0 || region.urgentCount > 0)
    .sort((first, second) => second.count - first.count || second.urgentCount - first.urgentCount);
  const branchBreakdown = branches
    .map((branch) => ({
      id: branch.id,
      label: branch.name,
      count: branch.openRequestCount,
      urgentCount: branch.urgentHouseholdCount,
      watchCount: branch.watchHouseholdCount,
      regionName: branch.regionName,
    }))
    .sort((first, second) => second.count - first.count || second.urgentCount - first.urgentCount);
  const transferSummary = {
    requestedCount: transfers.filter((item) => item.status === "requested").length,
    completedCount: transfers.filter((item) => item.status === "completed").length,
    reviewedCount: transfers.filter((item) => item.status === "reviewed").length,
  };
  const recentTransfers = transfers.slice(0, 6).map((transfer) => ({
    id: transfer.id,
    householdSlug: transfer.householdSlug,
    fromBranchName: transfer.fromBranchName,
    toBranchName: transfer.toBranchName,
    requestedByName: transfer.requestedByName,
    status: transfer.status,
    requestedLabel: transfer.requestedLabel,
    reason: transfer.reason,
  }));

  return {
    settings,
    ops: {
      ...getOperationsSnapshot(viewer, preferredBranchId),
      jobs: getJobSnapshot(organizationId),
    },
    summaryCards: [
      {
        label: "Open care requests",
        value: dashboard.openRequests.length,
        detail: `${overdueFollowUps.length} households need a follow-up touchpoint.`,
      },
      {
        label: "Active volunteers",
        value: users.filter((user) => user.active && user.role === "volunteer").length,
        detail: `${teams.length} ministry teams currently configured.`,
      },
      {
        label: "Resolved requests",
        value: dashboard.requests.filter((request) => request.status === "Closed").length,
        detail: "Closed requests remain in reporting until retention archives them.",
      },
      {
        label: "Recent audit activity",
        value: audits.length,
        detail: "Latest auth and workflow events captured for oversight.",
      },
    ],
    needBreakdown: Object.entries(needs)
      .map(([label, count]) => ({ label, count }))
      .sort((first, second) => second.count - first.count),
    stageBreakdown: Object.entries(stages)
      .map(([label, count]) => ({ label, count }))
      .sort((first, second) => second.count - first.count),
    volunteerLoads: listVolunteerRoster(viewer, preferredBranchId)
      .map((volunteer) => ({
        ...volunteer,
        loadLabel:
          volunteer.activeCount === 0
            ? "Available"
            : `${volunteer.activeCount} active task${volunteer.activeCount === 1 ? "" : "s"}`,
      }))
      .sort((first, second) => second.activeCount - first.activeCount),
    overdueFollowUps: overdueFollowUps.map((household) => ({
      slug: household.slug,
      name: household.name,
      owner: household.owner,
      dueLabel: household.nextTouchpointShortLabel,
    })),
    recentClosures: dashboard.requests
      .filter((request) => request.status === "Closed")
      .slice(0, 6)
      .map((request) => ({
        id: request.id,
        householdName: request.householdName,
        need: request.need,
        closedLabel: request.createdLabel,
      })),
    requestTrend: buildRequestTrend(dashboard.requests),
    ownerLoad: buildOwnerLoad(dashboard.households),
    sourceMix: buildSourceMix(dashboard.requests),
    agingBuckets: buildAgingBuckets(dashboard.requests),
    regionBreakdown,
    branchBreakdown,
    transferSummary,
    recentTransfers,
  };
}

export async function buildReportExport(type, viewer = null, preferredBranchId = "") {
  const db = getDatabase();
  const viewerScope = viewer ? buildViewerScope(viewer, preferredBranchId) : null;
  const branches = getBranchOverview(viewer, preferredBranchId);
  const transfers = listMemberTransfers(viewer, preferredBranchId);
  const organizationId = viewer
    ? resolveUserOrganizationId(viewer)
    : defaultPrimaryOrganizationId;

  const filterRows = (rows) =>
    viewerScope
      ? rows.filter((row) =>
          recordMatchesViewerScope(
            {
              organizationId: row.organizationId,
              branchId: row.branchId,
            },
            viewerScope
          )
        )
      : rows;

  switch (type) {
    case "households":
      {
        const rows = filterRows(
          db
            .prepare(`
              SELECT organization_id, branch_id, name, stage, risk, owner, next_touchpoint
              FROM households
              ORDER BY name ASC
            `)
            .all()
            .map((row) => ({
              organizationId: row.organization_id,
              branchId: row.branch_id,
              name: row.name,
              stage: row.stage,
              risk: row.risk,
              owner: row.owner,
              nextTouchpoint: row.next_touchpoint,
            }))
        );

      return {
        filename: `households-${Date.now()}.csv`,
        content: toCsv(
          ["Household", "Stage", "Risk", "Owner", "Next touchpoint", "Branch"],
          rows.map((row) => [
            row.name,
            row.stage,
            row.risk,
            row.owner,
            formatShortDateTime(row.nextTouchpoint),
            resolveBranch(row.branchId)?.name || row.branchId,
          ])
        ),
      };
      }
    case "users":
      {
        const users = viewer
          ? listUsers({ organizationId: resolveUserOrganizationId(viewer) }).filter((user) =>
              filterByViewerScope(
                [
                  {
                    organizationId: user.organizationId,
                    branchId: user.branchId || "",
                    user,
                  },
                ],
                viewer,
                preferredBranchId
              ).length > 0
            )
          : listUsers();

      return {
        filename: `users-${Date.now()}.csv`,
        content: toCsv(
          ["Name", "Email", "Role", "Lane", "Volunteer name", "Branch", "Active"],
          users.map((user) => [
            user.name,
            user.email,
            user.role,
            user.lane,
            user.volunteerName,
            resolveBranch(user.branchId)?.name || user.branchId || "",
            user.active ? "Yes" : "No",
          ])
        ),
      };
      }
    case "branches":
      return {
        filename: `branches-${Date.now()}.csv`,
        content: toCsv(
          ["Branch", "Region", "Location", "Open requests", "Closed requests", "Urgent households", "Watch households"],
          branches.map((branch) => [
            branch.name,
            branch.regionName,
            branch.locationLabel || branch.organizationName,
            branch.openRequestCount,
            branch.closedRequestCount,
            branch.urgentHouseholdCount,
            branch.watchHouseholdCount,
          ])
        ),
      };
    case "transfers":
      return {
        filename: `member-transfers-${Date.now()}.csv`,
        content: toCsv(
          [
            "Household",
            "From branch",
            "To branch",
            "Status",
            "Requested by",
            "Requested at",
            "Reason",
            "Note",
          ],
          transfers.map((transfer) => [
            transfer.householdSlug,
            transfer.fromBranchName,
            transfer.toBranchName,
            transfer.status,
            transfer.requestedByName,
            transfer.requestedAt,
            transfer.reason,
            transfer.note || "",
          ])
        ),
      };
    case "jobs":
      return {
        filename: `jobs-${Date.now()}.csv`,
        content: toCsv(
          [
            "Queue",
            "Type",
            "Status",
            "Organization",
            "Branch",
            "Created at",
            "Run after",
            "Attempts",
            "Max attempts",
            "Locked by",
            "Last error",
          ],
          listJobs(500, organizationId).map((job) => [
            job.queue,
            job.type,
            job.status,
            resolveOrganization(job.organizationId)?.name || job.organizationId || "",
            resolveBranch(job.branchId)?.name || job.branchId || "",
            job.createdAt,
            job.runAfter,
            job.attempts,
            job.maxAttempts,
            job.lockedBy || "",
            job.lastError || "",
          ])
        ),
      };
    case "audit":
      return {
        filename: `audit-${Date.now()}.csv`,
        content: toCsv(
          ["When", "Actor", "Role", "Action", "Target", "Summary", "Branch"],
          listAuditLogs(200, viewer, preferredBranchId).map((entry) => [
            entry.createdAt,
            entry.actorName,
            entry.actorRole,
            entry.action,
            `${entry.targetType}:${entry.targetId}`,
            entry.summary,
            resolveBranch(entry.branchId)?.name || entry.branchId || "",
          ])
        ),
      };
    case "cases":
    default:
      {
        const rows = filterRows(
          db
            .prepare(`
              SELECT
                organization_id,
                branch_id,
                tracking_code,
                household_name,
                need,
                status,
                owner,
                due_at,
                privacy_json
              FROM requests
              ORDER BY created_at DESC
            `)
            .all()
            .map((row) => ({
              organizationId: row.organization_id,
              branchId: row.branch_id,
              trackingCode: row.tracking_code || "",
              householdName: row.household_name,
              need: row.need,
              status: row.status,
              owner: row.owner,
              dueAt: row.due_at,
              privacy: parseJson(row.privacy_json, {}),
            }))
        );

      return {
        filename: `care-cases-${Date.now()}.csv`,
        content: toCsv(
          [
            "Tracking code",
            "Household",
            "Need",
            "Status",
            "Owner",
            "Due",
            "Privacy",
            "Branch",
          ],
          rows.map((row) => [
            row.trackingCode,
            row.householdName,
            row.need,
            row.status,
            row.owner,
            formatShortDateTime(row.dueAt),
            row.privacy.visibility || "",
            resolveBranch(row.branchId)?.name || row.branchId,
          ])
        ),
      };
      }
  }
}

export function createBranchEntry(input) {
  const now = new Date().toISOString();
  const organizationId = input.organizationId || defaultPrimaryOrganizationId;

  getDatabase()
    .prepare(`
      INSERT INTO branches (
        id, organization_id, region_id, slug, code, name, city, state, country,
        pastor_name, support_email, support_phone, is_headquarters, active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      randomUUID(),
      organizationId,
      input.regionId || null,
      input.slug,
      input.code,
      input.name,
      input.city || null,
      input.state || null,
      input.country || null,
      input.pastorName || null,
      input.supportEmail || null,
      input.supportPhone || null,
      input.isHeadquarters ? 1 : 0,
      input.active === false ? 0 : 1,
      now,
      now
    );
}

export function updateBranchEntry(branchId, input) {
  const existing = resolveBranch(branchId);
  if (!existing) {
    throw new Error("Branch not found.");
  }

  const now = new Date().toISOString();

  getDatabase()
    .prepare(`
      UPDATE branches
      SET
        slug = ?,
        code = ?,
        region_id = ?,
        name = ?,
        city = ?,
        state = ?,
        country = ?,
        pastor_name = ?,
        support_email = ?,
        support_phone = ?,
        is_headquarters = ?,
        active = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(
      input.slug || existing.slug,
      input.code || existing.code,
      input.regionId ?? existing.regionId ?? null,
      input.name || existing.name,
      input.city ?? existing.city ?? null,
      input.state ?? existing.state ?? null,
      input.country ?? existing.country ?? null,
      input.pastorName ?? existing.pastorName ?? null,
      input.supportEmail ?? existing.supportEmail ?? null,
      input.supportPhone ?? existing.supportPhone ?? null,
      input.isHeadquarters === undefined ? (existing.isHeadquarters ? 1 : 0) : input.isHeadquarters ? 1 : 0,
      input.active === undefined ? (existing.active ? 1 : 0) : input.active ? 1 : 0,
      now,
      branchId
    );
}

function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) =>
    row
      .map((value) => {
        const safe = String(value ?? "");
        if (safe.includes(",") || safe.includes("\"") || safe.includes("\n")) {
          return `"${safe.replace(/"/g, "\"\"")}"`;
        }
        return safe;
      })
      .join(",")
  );

  return `${lines.join("\n")}\n`;
}
