import { sha256Digest } from "../canonical-json.js";
import type { ObservationMeta, QualificationPrincipal, PermissionState, ReviewSnapshot } from "../types.js";
import { isRecord, readPositiveInt, readString } from "./api-types.js";
import { GitHubClient } from "./client.js";
import { GitHubAdapterError, makeDiagnostic, type GitHubDiagnostic } from "./diagnostics.js";

export interface QualificationResult {
  reviews: ReviewSnapshot[];
  diagnostics: GitHubDiagnostic[];
  collaboratorMeta: ObservationMeta;
  teamMeta: ObservationMeta;
}

const PERMISSION_RANK: Record<string, number> = { read: 1, triage: 2, write: 3, push: 3, maintain: 4, admin: 5 };

function sufficientPermission(value: string | undefined): boolean {
  return value !== undefined && (PERMISSION_RANK[value.toLowerCase()] ?? 0) >= 3;
}

function configuredTeamPrincipal(principal: string): { org: string; slug: string } | undefined {
  const normalized = principal.startsWith("@") ? principal.slice(1) : principal;
  const separator = normalized.indexOf("/");
  if (separator <= 0 || separator === normalized.length - 1) return undefined;
  return { org: normalized.slice(0, separator), slug: normalized.slice(separator + 1) };
}

function configuredUserPrincipal(principal: string, login: string): boolean {
  return principal === login || principal === `@${login}`;
}

async function collaborator(client: GitHubClient, owner: string, name: string, login: string, phase: "collection" | "finalization"): Promise<{ state: PermissionState; id?: number }> {
  const response = await client.request({ method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/collaborators/${encodeURIComponent(login)}/permission` }, "reviewer permission", phase);
  if (response.status === 403) return { state: "insufficient" };
  if (response.status === 404) return { state: "unknown" };
  if (!isRecord(response.body)) return { state: "unknown" };
  const id = isRecord(response.body.user) ? readPositiveInt(response.body.user, "id") : undefined;
  const permission = readString(response.body, "permission") ?? readString(response.body, "role_name");
  return { state: sufficientPermission(permission) ? "sufficient" : "insufficient", ...(id === undefined ? {} : { id }) };
}

async function teamMembership(client: GitHubClient, org: string, slug: string, login: string, phase: "collection" | "finalization"): Promise<{ principal?: QualificationPrincipal; state: PermissionState }> {
  const teamResponse = await client.request({ method: "GET", path: `/orgs/${encodeURIComponent(org)}/teams/${encodeURIComponent(slug)}` }, "team identity", phase);
  if (teamResponse.status === 403 || teamResponse.status === 404 || !isRecord(teamResponse.body)) return { state: teamResponse.status === 403 ? "insufficient" : "unknown" };
  const teamId = readPositiveInt(teamResponse.body, "id");
  if (teamId === undefined) return { state: "unknown" };
  const membershipResponse = await client.request({ method: "GET", path: `/orgs/${encodeURIComponent(org)}/teams/${encodeURIComponent(slug)}/memberships/${encodeURIComponent(login)}` }, "team membership", phase);
  if (membershipResponse.status === 403 || membershipResponse.status === 404 || !isRecord(membershipResponse.body)) return { state: membershipResponse.status === 403 ? "insufficient" : "unknown" };
  const state = readString(membershipResponse.body, "state");
  if (state !== "active" && state !== "pending") return { state: "unknown" };
  return { state: state === "active" ? "sufficient" : "unknown", principal: { configuredPrincipal: `@${org}/${slug}`, kind: "team", immutableId: teamId, membershipState: state } };
}

export async function qualifyReviews(client: GitHubClient, reviews: readonly ReviewSnapshot[], owner: string, name: string, principals: readonly string[], phase: "collection" | "finalization" = "collection"): Promise<QualificationResult> {
  const diagnostics: GitHubDiagnostic[] = [];
  const output: ReviewSnapshot[] = [];
  const collaboratorStates: PermissionState[] = [];
  const teamStates: PermissionState[] = [];
  const retrievedAt = new Date(client.clock.now()).toISOString();
  for (const review of reviews) {
    if (review.isAuthor || review.isBot) { output.push(review); continue; }
    const permission = await collaborator(client, owner, name, review.login, phase);
    collaboratorStates.push(permission.state);
    const bindings: QualificationPrincipal[] = [];
    const teamIds: number[] = [];
    const teams: string[] = [];
    let qualified = permission.state === "sufficient";
    let complete = permission.state !== "unknown";
    let permissionState: PermissionState = permission.state;
    for (const principal of principals) {
      const team = configuredTeamPrincipal(principal);
      if (team !== undefined) {
        const membership = await teamMembership(client, team.org, team.slug, review.login, phase);
        teamStates.push(membership.state);
        if (membership.principal !== undefined) { bindings.push(membership.principal); teamIds.push(membership.principal.immutableId); teams.push(`@${team.org}/${team.slug}`); }
        if (membership.state !== "sufficient") { complete = false; permissionState = membership.state; }
        qualified = qualified && membership.state === "sufficient" && permission.state === "sufficient";
      } else if (configuredUserPrincipal(principal, review.login)) {
        const binding: QualificationPrincipal = { configuredPrincipal: principal, kind: "user", immutableId: permission.id ?? review.actorId, membershipState: permission.state === "sufficient" ? "active" : "unknown" };
        bindings.push(binding);
        qualified = qualified && permission.state === "sufficient";
      }
    }
    if (principals.length > 0 && bindings.length === 0) qualified = false;
    if (permission.state === "unknown") complete = false;
    output.push({ ...review, qualified, teams: [...new Set(teams)], teamIds: [...new Set(teamIds)], qualification: { ...review.qualification, complete, permissionState, principalBindings: bindings } });
  }
  const aggregate = (states: readonly PermissionState[], identity: string, revision?: string): ObservationMeta => {
    const permissionState: PermissionState = states.length === 0 || states.includes("unknown") ? "unknown" : states.includes("insufficient") ? "insufficient" : "sufficient";
    return {
      source: { kind: "github", identity },
      ...(revision === undefined ? {} : { revision }),
      retrievedAt,
      complete: permissionState === "sufficient",
      permissionState,
      responseDigest: sha256Digest(states),
    };
  };
  return { reviews: output, diagnostics, collaboratorMeta: aggregate(collaboratorStates, "collaborator-permission"), teamMeta: aggregate(teamStates, "team-identity+membership") };
}
