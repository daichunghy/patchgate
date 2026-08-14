import { sha256Digest } from "../canonical-json.js";
import type { ObservationMeta, ReviewSnapshot } from "../types.js";
import type { RawReview } from "./api-types.js";
import { isRecord, readPositiveInt, readString } from "./api-types.js";
import { GitHubClient } from "./client.js";
import { collectPaginated } from "./pagination.js";
import { GitHubAdapterError, makeDiagnostic, type GitHubDiagnostic } from "./diagnostics.js";
import { safeAllowlistedString } from "./redaction.js";

export interface ReviewsResult {
  reviews: ReviewSnapshot[];
  meta: ObservationMeta;
  collaboratorMeta: ObservationMeta;
  teamMeta: ObservationMeta;
  diagnostics: GitHubDiagnostic[];
}

function reviewTime(review: RawReview): number {
  return review.submitted_at === undefined || review.submitted_at === null ? 0 : Date.parse(review.submitted_at);
}

function parseReviews(body: unknown): RawReview[] {
  if (!Array.isArray(body)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "The pull-request reviews response was not an array.", { observation: "reviews", snapshotEvaluable: false, exitCode: 2 }));
  return body.map((value, index) => {
    if (!isRecord(value)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Review ${index} was malformed.`, { observation: "reviews", snapshotEvaluable: false, exitCode: 2 }));
    const id = readPositiveInt(value, "id");
    const state = readString(value, "state");
    const commitId = readString(value, "commit_id");
    if (id === undefined || state === undefined || commitId === undefined || !isRecord(value.user)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Review ${index} lacked immutable actor/state/commit identity.`, { observation: "reviews", snapshotEvaluable: false, exitCode: 2 }));
    const actorId = readPositiveInt(value.user, "id");
    const login = readString(value.user, "login");
    if (actorId === undefined || login === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Review ${id} lacked actor identity.`, { observation: "reviews", snapshotEvaluable: false, exitCode: 2 }));
    if (state !== "APPROVED" && state !== "CHANGES_REQUESTED" && state !== "COMMENTED" && state !== "DISMISSED") throw new GitHubAdapterError(makeDiagnostic("GITHUB_API_UNSUPPORTED", `Review ${id} had an unsupported state ${state}.`, { observation: "reviews" }));
    const submittedAt = readString(value, "submitted_at");
    if (submittedAt !== undefined && !Number.isFinite(Date.parse(submittedAt))) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", `Review ${id} had an invalid submitted_at timestamp.`, { observation: "reviews", snapshotEvaluable: false, exitCode: 2 }));
    const association = readString(value, "author_association");
    const userType = readString(value.user, "type");
    return { id, user: { id: actorId, login, ...(userType === undefined ? {} : { type: userType }) }, state, commit_id: commitId, ...(submittedAt === undefined ? {} : { submitted_at: submittedAt }), ...(association === undefined ? {} : { author_association: association }) };
  });
}

export async function collectReviews(client: GitHubClient, owner: string, name: string, pullNumber: number, testedSha: string, authorId: number | undefined, phase: "collection" | "finalization" = "collection"): Promise<ReviewsResult> {
  const collection = await collectPaginated(client, { method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${pullNumber}/reviews`, query: { per_page: 100 } }, "reviews", parseReviews, (review) => String(review.id), { phase });
  const diagnostics = [...collection.diagnostics];
  const latestByActor = new Map<number, RawReview>();
  for (const review of collection.items) {
    const actorId = review.user?.id ?? 0;
    const current = latestByActor.get(actorId);
    if (current === undefined || reviewTime(review) > reviewTime(current) || (reviewTime(review) === reviewTime(current) && review.id > current.id)) latestByActor.set(actorId, review);
  }
  const reviews: ReviewSnapshot[] = collection.items.map((review) => {
    const actor = review.user;
    if (actor === null || actor === undefined) throw new GitHubAdapterError(makeDiagnostic("GITHUB_RESPONSE_MALFORMED", "A review actor was unexpectedly absent after parsing.", { observation: "reviews", snapshotEvaluable: false, exitCode: 2 }));
    const latest = latestByActor.get(actor.id);
    const latestState = latest?.state;
    const active = latest?.id === review.id && latestState !== "DISMISSED";
    const isBot = actor.type === "Bot" || actor.login.endsWith("[bot]");
    return { reviewId: review.id, actorId: actor.id, login: safeAllowlistedString(actor.login, `review ${review.id} login`, 200), state: review.state as ReviewSnapshot["state"], commitId: review.commit_id, qualified: false, teams: [], teamIds: [], qualification: { source: { kind: "github", identity: "collaborator-permission" }, revision: testedSha, complete: !isBot, permissionState: isBot ? "sufficient" : "unknown" }, isAuthor: authorId !== undefined && authorId === actor.id, isBot, active };
  });
  const retrievedAt = new Date(client.clock.now()).toISOString();
  const qualificationMeta: ObservationMeta = { source: { kind: "github", identity: "collaborator-permission" }, revision: testedSha, retrievedAt, complete: collection.complete, permissionState: collection.permissionState, responseDigest: sha256Digest([]) };
  const teamMeta: ObservationMeta = { source: { kind: "github", identity: "team-identity+membership" }, revision: testedSha, retrievedAt, complete: collection.complete, permissionState: collection.permissionState, responseDigest: sha256Digest([]) };
  return { reviews, meta: { source: { kind: "github", identity: "pull-request-reviews" }, revision: testedSha, retrievedAt, complete: collection.complete, permissionState: collection.permissionState, responseDigest: sha256Digest(collection.pageDigests) }, collaboratorMeta: qualificationMeta, teamMeta, diagnostics };
}
