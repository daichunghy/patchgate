import { GitHubAdapterError, makeDiagnostic } from "./diagnostics.js";
import { sameSnapshotIdentity, type SnapshotIdentity } from "./identity.js";

export function assertTargetStable(initial: SnapshotIdentity, reread: SnapshotIdentity): void {
  if (!sameSnapshotIdentity(initial, reread)) throw new GitHubAdapterError(makeDiagnostic("GITHUB_TARGET_CHANGED", "The pull-request target identity changed during snapshot finalization.", { remediation: "Discard the snapshot and rerun the complete read-only evaluation against the new base/head/merge identity.", snapshotEvaluable: false, exitCode: 2 }));
}

export function assertObservationStable(group: string, initialDigest: string, rereadDigest: string): void {
  if (initialDigest !== rereadDigest) throw new GitHubAdapterError(makeDiagnostic("GITHUB_PROVENANCE_AMBIGUOUS", `The ${group} observation changed during snapshot finalization.`, { observation: group, remediation: "Discard the complete snapshot and rerun; do not patch old observations with new data.", snapshotEvaluable: false, exitCode: 2 }));
}

