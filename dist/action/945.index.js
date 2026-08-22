export const id = 945;
export const ids = [945];
export const modules = {

/***/ 1945:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.fetchTrustedBasePolicy = fetchTrustedBasePolicy;
const node_crypto_1 = __webpack_require__(7598);
const canonical_json_js_1 = __webpack_require__(2992);
const policy_js_1 = __webpack_require__(8757);
const api_types_js_1 = __webpack_require__(5319);
const diagnostics_js_1 = __webpack_require__(1859);
const redaction_js_1 = __webpack_require__(826);
function responseDigest(response) {
    return (0, canonical_json_js_1.sha256Digest)((0, redaction_js_1.redactForReport)({ status: response.status, headers: response.headers, body: response.body }));
}
async function fetchTrustedBasePolicy(client, owner, name, baseSha, allowConfirmedAbsence = false, phase = "collection") {
    const retrievedAt = new Date(client.clock.now()).toISOString();
    const policyPaths = ["patchgate.yml", ".github/patchgate.yml"];
    let selectedPath = policyPaths[0];
    const responseDigests = [];
    try {
        let response;
        for (const path of policyPaths) {
            selectedPath = path;
            const candidate = await client.request({ method: "GET", path: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, query: { ref: baseSha } }, `base policy:${path}`, phase);
            responseDigests.push(responseDigest(candidate));
            if (candidate.status === 404 && path !== policyPaths[policyPaths.length - 1])
                continue;
            response = candidate;
            break;
        }
        if (response === undefined)
            throw new diagnostics_js_1.GitHubAdapterError((0, diagnostics_js_1.makeDiagnostic)("GITHUB_RESOURCE_NOT_VISIBLE", "The trusted base policy lookup did not return a terminal response.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
        const responseDigestValue = (0, canonical_json_js_1.sha256Digest)(responseDigests);
        if (response.status === 403)
            return { meta: { source: { kind: "github", identity: `contents:${selectedPath}` }, revision: baseSha, retrievedAt, complete: false, permissionState: "insufficient", responseDigest: responseDigestValue }, diagnostics: [(0, diagnostics_js_1.makeDiagnostic)("GITHUB_PERMISSION_INSUFFICIENT", "GitHub denied access to the trusted base policy.", { observation: "policySources", remediation: "Grant Contents: read to the read-only credential; do not use the PR head as a fallback." })] };
        if (response.status === 404) {
            const diagnosticId = allowConfirmedAbsence ? "GITHUB_POLICY_ABSENT" : "GITHUB_RESOURCE_NOT_VISIBLE";
            return { meta: { source: { kind: "github", identity: `contents:${selectedPath}` }, revision: baseSha, retrievedAt, complete: allowConfirmedAbsence, permissionState: allowConfirmedAbsence ? "sufficient" : "unknown", responseDigest: responseDigestValue }, diagnostics: [(0, diagnostics_js_1.makeDiagnostic)(diagnosticId, allowConfirmedAbsence ? "No supported patchgate.yml path exists at the trusted base revision." : "The trusted base policy is not visible; a hidden 404 is not treated as absence.", { observation: "policySources", permissionState: allowConfirmedAbsence ? "sufficient" : "unknown", complete: allowConfirmedAbsence, remediation: allowConfirmedAbsence ? "Confirm whether the repository intentionally operates without a structured PatchGate policy; this is never an empty green policy." : "Confirm Contents: read and repository visibility, then rerun the snapshot." })] };
        }
        if (response.status !== 200 || !(0, api_types_js_1.isRecord)(response.body))
            throw new diagnostics_js_1.GitHubAdapterError((0, diagnostics_js_1.makeDiagnostic)("GITHUB_RESPONSE_MALFORMED", "The base policy contents response was not a successful file object.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
        const type = (0, api_types_js_1.readString)(response.body, "type");
        const encoding = (0, api_types_js_1.readString)(response.body, "encoding");
        const content = (0, api_types_js_1.readString)(response.body, "content");
        const path = (0, api_types_js_1.readString)(response.body, "path");
        const size = (0, api_types_js_1.readPositiveInt)(response.body, "size");
        if (type !== "file" || encoding !== "base64" || content === undefined || path !== selectedPath || size === undefined)
            throw new diagnostics_js_1.GitHubAdapterError((0, diagnostics_js_1.makeDiagnostic)("GITHUB_RESPONSE_MALFORMED", "The base policy file response had an unexpected encoding, path, or size.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
        if (size > client.budget.limits.maxResponseBytes || content.length > client.budget.limits.maxResponseBytes * 2)
            throw new diagnostics_js_1.GitHubAdapterError((0, diagnostics_js_1.makeDiagnostic)("GITHUB_RESPONSE_TOO_LARGE", "The trusted base policy exceeded the configured response budget.", { observation: "policySources", remediation: "Reduce the policy artifact or raise the reviewed response cap." }));
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content.replace(/\s+/g, "")))
            throw new diagnostics_js_1.GitHubAdapterError((0, diagnostics_js_1.makeDiagnostic)("GITHUB_RESPONSE_MALFORMED", "The trusted base policy was not valid base64.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
        const bytes = Buffer.from(content.replace(/\s+/g, ""), "base64");
        if (bytes.length !== size)
            throw new diagnostics_js_1.GitHubAdapterError((0, diagnostics_js_1.makeDiagnostic)("GITHUB_RESPONSE_MALFORMED", "The trusted base policy byte count did not match the API size.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
        let text;
        try {
            text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        }
        catch {
            throw new diagnostics_js_1.GitHubAdapterError((0, diagnostics_js_1.makeDiagnostic)("GITHUB_RESPONSE_MALFORMED", "The trusted base policy was not valid UTF-8.", { observation: "policySources", snapshotEvaluable: false, exitCode: 2 }));
        }
        let artifact;
        try {
            artifact = (0, policy_js_1.createTrustedPolicyArtifact)(text, { identity: selectedPath, revision: baseSha }, selectedPath);
        }
        catch (error) {
            throw new diagnostics_js_1.GitHubAdapterError((0, diagnostics_js_1.makeDiagnostic)("GITHUB_POLICY_INVALID", error instanceof Error ? error.message : "The trusted base policy failed validation.", { observation: "policySources", remediation: "Repair patchgate.yml at the base revision and rerun the snapshot." }));
        }
        const rawBytesDigest = `sha256:${(0, node_crypto_1.createHash)("sha256").update(bytes).digest("hex")}`;
        const source = { ...artifact.source, digest: rawBytesDigest };
        return { artifact, source, rawDigest: rawBytesDigest, rawBytesDigest, meta: { source: { kind: "github", identity: `contents:${selectedPath}` }, revision: baseSha, retrievedAt, complete: true, permissionState: "sufficient", responseDigest: responseDigestValue }, diagnostics: [] };
    }
    catch (error) {
        const diagnostic = (0, diagnostics_js_1.diagnosticFrom)(error, "GITHUB_POLICY_INVALID");
        return { meta: { source: { kind: "github", identity: `contents:${selectedPath}` }, revision: baseSha, retrievedAt, complete: false, permissionState: diagnostic.permissionState, ...(responseDigests.length === 0 ? {} : { responseDigest: (0, canonical_json_js_1.sha256Digest)(responseDigests) }) }, diagnostics: [diagnostic] };
    }
}


/***/ }),

/***/ 8757:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createTrustedPolicyArtifact = createTrustedPolicyArtifact;
exports.loadPatchgatePolicy = loadPatchgatePolicy;
exports.loadPatchgatePolicyFromGitRefWithFallback = loadPatchgatePolicyFromGitRefWithFallback;
exports.loadPatchgatePolicyFromGitRef = loadPatchgatePolicyFromGitRef;
const promises_1 = __webpack_require__(1455);
const node_child_process_1 = __webpack_require__(1421);
const node_util_1 = __webpack_require__(7975);
const node_path_1 = __webpack_require__(6760);
const yaml_1 = __webpack_require__(6995);
const canonical_json_js_1 = __webpack_require__(2992);
const digests_js_1 = __webpack_require__(6596);
const validation_js_1 = __webpack_require__(4875);
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function field(record, camel, snake) {
    if (camel !== snake && record[camel] !== undefined && record[snake] !== undefined) {
        throw new Error(`${camel} and ${snake} must not both be provided`);
    }
    return record[camel] ?? record[snake];
}
function assertKnownKeys(record, allowed, context) {
    const unknown = Object.keys(record).find((key) => !allowed.includes(key));
    if (unknown !== undefined)
        throw new Error(`${context}.${unknown} is an unsupported field`);
}
function nonEmpty(value, key) {
    if (value.trim().length === 0)
        throw new Error(`${key} must be a non-empty string`);
    return value;
}
function requiredString(record, key) {
    const value = record[key];
    if (typeof value !== "string")
        throw new Error(`${key} must be a non-empty string`);
    return nonEmpty(value, key);
}
function requiredNumber(record, camel, snake) {
    const value = field(record, camel, snake);
    if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`${camel} must be a finite number`);
    return value;
}
function requiredBoolean(record, camel, snake) {
    const value = field(record, camel, snake);
    if (typeof value !== "boolean")
        throw new Error(`${camel} must be boolean`);
    return value;
}
function stringArray(value, key, minimum = 0) {
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
        throw new Error(`${key} must be an array of non-empty strings`);
    }
    if (value.length < minimum)
        throw new Error(`${key} must contain at least ${minimum} item(s)`);
    if (new Set(value).size !== value.length)
        throw new Error(`${key} must not contain duplicate values`);
    return value;
}
function optionalRecord(record, camel, snake) {
    const value = field(record, camel, snake);
    if (value === undefined)
        return undefined;
    if (!isRecord(value))
        throw new Error(`${camel} must be an object`);
    return value;
}
function normalizeExpectedSource(value) {
    if (value === undefined)
        throw new Error("requiredChecks.expectedSource is required");
    if (!isRecord(value))
        throw new Error("expectedSource must be an object");
    assertKnownKeys(value, ["kind", "appSlug", "app_slug", "appId", "app_id", "workflowId", "workflow_id", "workflowPath", "workflow_path", "event"], "expectedSource");
    const kind = value.kind;
    if (kind !== "github_app_expected" && kind !== "github_actions_workflow") {
        throw new Error("expectedSource.kind is unsupported");
    }
    const appSlug = field(value, "appSlug", "app_slug");
    const appId = field(value, "appId", "app_id");
    const workflowId = field(value, "workflowId", "workflow_id");
    const workflowPath = field(value, "workflowPath", "workflow_path");
    const event = value.event;
    if (appSlug !== undefined && (typeof appSlug !== "string" || appSlug.trim().length === 0))
        throw new Error("expectedSource.appSlug must be a non-empty string");
    if (appId !== undefined && (typeof appId !== "number" || !Number.isInteger(appId) || appId < 1))
        throw new Error("expectedSource.appId must be a positive integer");
    if (workflowId !== undefined && (typeof workflowId !== "number" || !Number.isInteger(workflowId) || workflowId < 1))
        throw new Error("expectedSource.workflowId must be a positive integer");
    if (workflowPath !== undefined && (typeof workflowPath !== "string" || workflowPath.trim().length === 0))
        throw new Error("expectedSource.workflowPath must be a non-empty string");
    if (event !== undefined && (typeof event !== "string" || event.trim().length === 0))
        throw new Error("expectedSource.event must be a non-empty string");
    if (kind === "github_app_expected" && appId === undefined)
        throw new Error("GitHub App expected source must identify an immutable appId");
    if (kind === "github_actions_workflow" && (appId === undefined || (workflowId === undefined && workflowPath === undefined))) {
        throw new Error("GitHub Actions expected source must identify appId and workflowId or workflowPath");
    }
    return {
        kind,
        ...(appSlug === undefined ? {} : { appSlug }),
        ...(appId === undefined ? {} : { appId }),
        ...(workflowId === undefined ? {} : { workflowId }),
        ...(workflowPath === undefined ? {} : { workflowPath }),
        ...(event === undefined ? {} : { event }),
    };
}
function normalizePolicy(parsed) {
    assertKnownKeys(parsed, ["version", "issueLinkage", "issue_linkage", "requiredChecks", "required_checks", "ownership", "sensitivePaths", "sensitive_paths", "policyChanges", "policy_changes", "reviewability"], "policy");
    const normalized = { version: 1 };
    const issueLinkage = optionalRecord(parsed, "issueLinkage", "issue_linkage");
    if (issueLinkage !== undefined) {
        assertKnownKeys(issueLinkage, ["required"], "issueLinkage");
        normalized.issueLinkage = { required: requiredBoolean(issueLinkage, "required", "required") };
    }
    const checks = field(parsed, "requiredChecks", "required_checks");
    if (checks !== undefined) {
        if (!Array.isArray(checks))
            throw new Error("requiredChecks must be an array");
        normalized.requiredChecks = checks.map((item) => {
            if (!isRecord(item))
                throw new Error("requiredChecks entries must be objects");
            assertKnownKeys(item, ["id", "name", "target", "acceptableConclusions", "acceptable_conclusions", "expectedSource", "expected_source"], "requiredChecks entry");
            const target = requiredString(item, "target");
            if (target !== "head" && target !== "merge" && target !== "merge_group")
                throw new Error("requiredChecks.target is unsupported");
            const conclusions = stringArray(field(item, "acceptableConclusions", "acceptable_conclusions"), "acceptableConclusions", 1);
            const expectedSource = normalizeExpectedSource(field(item, "expectedSource", "expected_source"));
            return { id: requiredString(item, "id"), name: requiredString(item, "name"), target, acceptableConclusions: conclusions, expectedSource };
        });
    }
    const ownership = optionalRecord(parsed, "ownership", "ownership");
    if (ownership !== undefined) {
        assertKnownKeys(ownership, ["requireCodeOwnerApproval", "require_code_owner_approval"], "ownership");
        normalized.ownership = { requireCodeOwnerApproval: requiredBoolean(ownership, "requireCodeOwnerApproval", "require_code_owner_approval") };
    }
    const sensitivePaths = field(parsed, "sensitivePaths", "sensitive_paths");
    if (sensitivePaths !== undefined) {
        if (!Array.isArray(sensitivePaths))
            throw new Error("sensitivePaths must be an array");
        normalized.sensitivePaths = sensitivePaths.map((item) => {
            if (!isRecord(item))
                throw new Error("sensitivePaths entries must be objects");
            assertKnownKeys(item, ["id", "patterns", "requiredReviewers", "required_reviewers", "requiredCount", "required_count", "humanGate", "human_gate"], "sensitivePaths entry");
            return {
                id: requiredString(item, "id"),
                patterns: stringArray(item.patterns, "patterns", 1),
                requiredReviewers: stringArray(field(item, "requiredReviewers", "required_reviewers"), "requiredReviewers", 1),
                requiredCount: requiredNumber(item, "requiredCount", "required_count"),
                humanGate: requiredBoolean(item, "humanGate", "human_gate"),
            };
        });
    }
    const policyChanges = optionalRecord(parsed, "policyChanges", "policy_changes");
    if (policyChanges !== undefined) {
        assertKnownKeys(policyChanges, ["mode", "paths"], "policyChanges");
        const mode = requiredString(policyChanges, "mode");
        if (mode !== "advisory" && mode !== "human_review" && mode !== "blocked")
            throw new Error("policyChanges.mode is unsupported");
        normalized.policyChanges = { mode, paths: stringArray(policyChanges.paths, "policyChanges.paths", 1) };
    }
    const reviewability = optionalRecord(parsed, "reviewability", "reviewability");
    if (reviewability !== undefined) {
        assertKnownKeys(reviewability, ["mode", "budgets"], "reviewability");
        const mode = requiredString(reviewability, "mode");
        if (mode !== "advisory" && mode !== "blocking")
            throw new Error("reviewability.mode is unsupported");
        const budgets = optionalRecord(reviewability, "budgets", "budgets");
        if (budgets === undefined)
            throw new Error("reviewability.budgets is required");
        assertKnownKeys(budgets, ["maxFiles", "max_files", "maxOwnershipDomains", "max_ownership_domains", "maxGeneratedFiles", "max_generated_files", "maxBoundaries", "max_boundaries"], "reviewability.budgets");
        const result = {};
        const budgetFields = [
            ["maxFiles", "maxFiles", "max_files"],
            ["maxOwnershipDomains", "maxOwnershipDomains", "max_ownership_domains"],
            ["maxGeneratedFiles", "maxGeneratedFiles", "max_generated_files"],
            ["maxBoundaries", "maxBoundaries", "max_boundaries"],
        ];
        for (const [key, camel, snake] of budgetFields) {
            const value = field(budgets, camel, snake);
            if (value !== undefined) {
                if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || !Number.isInteger(value))
                    throw new Error(`${camel} must be a non-negative integer`);
                result[key] = value;
            }
        }
        normalized.reviewability = { mode, budgets: result };
    }
    (0, validation_js_1.assertPatchgatePolicy)(normalized);
    return normalized;
}
function createTrustedPolicyArtifact(contents, expected, path = expected.identity) {
    const parsed = (0, yaml_1.parse)(contents);
    if (!isRecord(parsed) || parsed.version !== 1) {
        throw new Error(`${(0, node_path_1.basename)(path)} must be a PatchGate policy with version: 1`);
    }
    const policy = normalizePolicy(parsed);
    const digest = (0, canonical_json_js_1.sha256Text)(contents);
    const contractDigest = (0, digests_js_1.normalizedPolicyDigest)(policy);
    const source = {
        kind: "patchgate",
        identity: expected.identity,
        revision: expected.revision,
        digest,
        contractDigest,
        authority: "enforced",
    };
    return { path, digest, contractDigest, policy, source };
}
async function loadPatchgatePolicy(basePath, expected = {}) {
    const baseStat = await (0, promises_1.stat)(basePath);
    if (!baseStat.isDirectory()) {
        const contents = await (0, promises_1.readFile)(basePath, "utf8");
        return createTrustedPolicyArtifact(contents, { identity: expected.identity ?? "patchgate.yml", revision: expected.revision ?? "local" }, basePath);
    }
    // Match the adapter contract: the trusted policy may live at the repository
    // root or under .github/, in that order.
    for (const candidate of ["patchgate.yml", (0, node_path_1.join)(".github", "patchgate.yml")]) {
        const policyPath = (0, node_path_1.join)(basePath, candidate);
        let contents;
        try {
            contents = await (0, promises_1.readFile)(policyPath, "utf8");
        }
        catch {
            continue;
        }
        return createTrustedPolicyArtifact(contents, { identity: expected.identity ?? candidate, revision: expected.revision ?? "local" }, policyPath);
    }
    throw new Error(`ENOENT: no supported patchgate.yml found in ${basePath} (tried patchgate.yml and .github/patchgate.yml)`);
}
async function loadPatchgatePolicyFromGitRefWithFallback(repositoryPath, ref) {
    try {
        return await loadPatchgatePolicyFromGitRef(repositoryPath, ref, "patchgate.yml");
    }
    catch (rootError) {
        try {
            return await loadPatchgatePolicyFromGitRef(repositoryPath, ref, (0, node_path_1.join)(".github", "patchgate.yml"));
        }
        catch {
            throw rootError;
        }
    }
}
async function loadPatchgatePolicyFromGitRef(repositoryPath, ref, identity = "patchgate.yml") {
    if (ref.trim().length === 0)
        throw new Error("Git base ref must be non-empty");
    if (identity.includes("\0") || identity.startsWith("/") || identity.includes("..")) {
        throw new Error("Git policy identity must be a repository-relative path");
    }
    const revisionResult = await execFileAsync("git", ["-C", repositoryPath, "rev-parse", "--verify", "--end-of-options", ref + "^{commit}"], { encoding: "utf8", maxBuffer: 64 * 1024 });
    const revision = revisionResult.stdout.trim();
    if (!/^[0-9a-f]{7,64}$/i.test(revision))
        throw new Error("Git did not return a valid base commit");
    const contentsResult = await execFileAsync("git", ["-C", repositoryPath, "cat-file", "blob", revision + ":" + identity], { encoding: "utf8", maxBuffer: 1024 * 1024 });
    return createTrustedPolicyArtifact(contentsResult.stdout, { identity, revision }, repositoryPath + "@" + ref + ":" + identity);
}


/***/ })

};
