export type FinalStatus =
  | "ready_for_review"
  | "blocked"
  | "human_review_required"
  | "evidence_missing"
  | "policy_ambiguous";

export type RequirementResult = "passed" | "failed" | "unknown" | "advisory";

export type SchemaVersion = "0.1";
export type ReceiptSchemaVersion = "0.1";
// Semantic-version-shaped; the receipt schema pattern rejects non-semver
// strings so a version bump does not require a schema const change.
export type EvaluatorVersion = `${number}.${number}.${number}${"" | `-${string}` | `+${string}`}`;

export type TargetKind = "head" | "merge" | "merge_group";

export type PolicySourceKind = "patchgate" | "codeowners" | "ruleset" | "branch_protection";

export type PermissionState = "sufficient" | "insufficient" | "unknown";

export interface ObservationSource {
  kind: string;
  identity: string;
}

export interface ObservationMeta {
  source: ObservationSource;
  revision?: string | undefined;
  retrievedAt: string;
  complete: boolean;
  permissionState: PermissionState;
  normalizedDigest?: string | undefined;
  responseDigest?: string | undefined;
  truncated?: boolean | undefined;
  nextCursor?: string | undefined;
}

export interface EvaluationObservations {
  policySources: ObservationMeta[];
  changedPaths: ObservationMeta;
  linkedIssues: ObservationMeta;
  reviews: ObservationMeta;
  checks: ObservationMeta;
  ownership: ObservationMeta;
  reviewability: ObservationMeta;
}

export interface PolicySource {
  kind: PolicySourceKind;
  identity: string;
  revision: string;
  digest: string;
  contractDigest?: string | undefined;
  authority: "enforced";
}

export interface ExpectedSource {
  kind: Exclude<SourceStrength, "unattributed">;
  appSlug?: string | undefined;
  appId?: number | undefined;
  workflowId?: number | undefined;
  workflowPath?: string | undefined;
  event?: string | undefined;
}

export interface RequiredCheckRule {
  id: string;
  name: string;
  target: TargetKind;
  acceptableConclusions: string[];
  expectedSource: ExpectedSource;
}

export interface IssueLinkagePolicy {
  required: boolean;
}

export interface OwnershipPolicy {
  requireCodeOwnerApproval: boolean;
}

export interface SensitivePathRule {
  id: string;
  patterns: string[];
  requiredReviewers: string[];
  requiredCount: number;
  humanGate: boolean;
}

export interface PolicyChangePolicy {
  mode: "advisory" | "human_review" | "blocked";
  paths: string[];
}

export interface ReviewabilityPolicy {
  mode: "advisory" | "blocking";
  budgets: {
    maxFiles?: number;
    maxOwnershipDomains?: number;
    maxGeneratedFiles?: number;
    maxBoundaries?: number;
  };
}

export interface PatchgatePolicy {
  version: 1;
  issueLinkage?: IssueLinkagePolicy;
  requiredChecks?: RequiredCheckRule[];
  ownership?: OwnershipPolicy;
  sensitivePaths?: SensitivePathRule[];
  policyChanges?: PolicyChangePolicy;
  reviewability?: ReviewabilityPolicy;
}

export interface LinkedIssue {
  repository: string;
  number: number;
  repositoryId: string;
  issueId: string;
  linked: boolean;
}

export interface QualificationObservation {
  source: ObservationSource;
  revision?: string | undefined;
  complete: boolean;
  permissionState: PermissionState;
  principalBindings?: QualificationPrincipal[] | undefined;
}

export interface QualificationPrincipal {
  configuredPrincipal: string;
  kind: "user" | "team";
  immutableId: number;
  membershipState: "active" | "pending" | "unknown";
}

export interface ReviewSnapshot {
  reviewId: number;
  actorId: number;
  login: string;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED";
  commitId: string;
  qualified: boolean;
  teams: string[];
  teamIds: number[];
  qualification: QualificationObservation;
  isAuthor: boolean;
  isBot: boolean;
  active: boolean;
}

export interface CheckEvidence {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: string | undefined;
  testedSha: string;
  appSlug?: string | undefined;
  appId?: number | undefined;
  checkRunId?: number | undefined;
  checkSuiteId?: number | undefined;
  workflowId?: number | undefined;
  workflowPath?: string | undefined;
  workflowRunId?: number | undefined;
  workflowRunAttempt?: number | undefined;
  event?: string | undefined;
  sourceStrength: SourceStrength;
  retrievedAt: string;
}

export interface OwnershipRequirement {
  id: string;
  owners: string[];
  requiredCount: number;
}

export interface NativeReviewControls {
  requiredApprovals: number;
  requireCodeOwnerReviews: boolean;
  requireLastPushApproval: boolean;
  staleReviews: boolean;
  requiredReviewThreadResolution: boolean;
  bypassVisible: boolean;
  decisionBearing: boolean;
}

export interface NativeBranchProtection extends NativeReviewControls {
  requiredChecks: Array<{ context: string; appId?: number | undefined }>;
}

export interface NativeRuleset extends NativeReviewControls {
  id: number;
  name: string;
  sourceType: string;
  source: string;
  enforcement: "active" | "evaluate" | "disabled" | "unknown";
  applicable: boolean;
  ruleTypes: string[];
  requiredChecks: Array<{ context: string; appId?: number | undefined }>;
}

export interface NativeControls {
  branchProtection?: NativeBranchProtection | undefined;
  rulesets?: NativeRuleset[] | undefined;
}

export interface ReviewabilitySnapshot {
  fileCount: number;
  ownershipDomains: string[];
  generatedFileCount: number;
  boundaryCount: number;
}

export interface EvaluationInput {
  schemaVersion: SchemaVersion;
  repository: { owner: string; name: string; pullRequest: number };
  revisions: {
    baseSha: string;
    headSha: string;
    mergeSha?: string;
    mergeGroupSha?: string;
    testedSha: string;
    targetKind: TargetKind;
  };
  policy: PatchgatePolicy | null;
  policySources: PolicySource[];
  policyDigest: string;
  changedPaths: string[];
  linkedIssues: LinkedIssue[];
  reviews: ReviewSnapshot[];
  checks: CheckEvidence[];
  ownershipRequirements: OwnershipRequirement[];
  nativeControls?: NativeControls | undefined;
  reviewability?: ReviewabilitySnapshot;
  observations: EvaluationObservations;
}

export type RequirementRuleClass =
  | "policy_integrity"
  | "issue_linkage"
  | "required_check"
  | "ownership"
  | "human_handoff"
  | "reviewability";

export interface Requirement {
  id: string;
  ruleClass: RequirementRuleClass;
  authority: PolicySourceKind | "derived";
  source: string;
  result: RequirementResult;
  severity: "block" | "human_gate" | "evidence" | "advisory";
  observed?: Record<string, string | number | boolean | string[]>;
  remediation: string;
  evidenceRefs: string[];
}

export interface HumanGate {
  id: string;
  reason: string;
  satisfied: boolean;
  requiredReviewers: string[];
  requiredCount: number;
  approvedBy: string[];
}

export interface ReceiptEvidence {
  checks: CheckEvidence[];
  linkedIssues: LinkedIssue[];
  reviews: ReviewSnapshot[];
  ownershipRequirements: OwnershipRequirement[];
}

export interface ContributionReceiptCore {
  schemaVersion: ReceiptSchemaVersion;
  evaluatorVersion: EvaluatorVersion;
  repository: EvaluationInput["repository"];
  revisions: EvaluationInput["revisions"];
  policyDigest: string;
  decisionInputDigest: string;
  receiptDigest: string;
  changedPaths: string[];
  policySources: PolicySource[];
  nativeControls?: NativeControls | undefined;
  observations: EvaluationObservations;
  evidence: ReceiptEvidence;
  requirements: Requirement[];
  reviewability?: ReviewabilitySnapshot;
  humanGates: HumanGate[];
  final: {
    status: FinalStatus;
    reasonIds: string[];
  };
}

export interface ContributionReceipt extends ContributionReceiptCore {
  evaluatedAt: string;
}

export type SourceStrength =
  | "github_app_expected"
  | "github_actions_workflow"
  | "unattributed";
