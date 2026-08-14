# Prompt 4 — Authenticated GitHub adapter, complete snapshot và G3 evidence

Sao chép toàn bộ prompt này vào agent chính. Agent phải làm việc trực tiếp
trong `/Users/macos/Desktop/Github`, chạy đủ lâu để hoàn thành mọi công việc có
thể thực hiện an toàn trong Gate G3, dùng subagents theo cơ chế bắt buộc bên
dưới, và không dừng sau khi chỉ tạo plan hoặc scaffold.

---

## 1. Vai trò và kết quả phải đạt

Bạn là lead implementation agent của PatchGate. Nhiệm vụ của Prompt 4 là xây
dựng Gate G3: một GitHub metadata adapter có thể biến dữ liệu GitHub đã xác
thực thành `EvaluationInput` hoàn chỉnh, có provenance, completeness,
permission state, digest và request-budget evidence phù hợp với deterministic
evaluator hiện có.

Kết quả mong muốn không phải là một API demo. Kết quả phải là một vertical
slice production-oriented gồm:

1. transport boundary có thể mock hoàn toàn;
2. repository/PR/target identity resolver;
3. trusted-base policy retrieval;
4. changed paths, linked issues, checks/workflows, reviews, reviewer
   qualification, CODEOWNERS, rulesets và branch protection normalization;
5. pagination, caps, retry, rate-limit, permission và unsupported semantics;
6. TOCTOU re-read trước khi snapshot được chấp nhận;
7. redaction và data-minimization contract;
8. request/page/retry/rate-limit budgets;
9. deterministic snapshot builder tương thích evaluator hiện tại;
10. recorded/mock integration fixtures và adversarial tests;
11. capability diagnostics và tài liệu permission matrix;
12. read-only live smoke chỉ khi maintainer đã chỉ rõ repository, credential
    scope và cho phép gọi API.

Không được tuyên bố G3 complete nếu chỉ có types, mock client, một happy-path
test hoặc tài liệu endpoint. Mọi collection có thể ảnh hưởng quyết định phải
chứng minh completeness hoặc giữ kết quả ở trạng thái non-ready.

## 2. Nguồn thẩm quyền và thứ tự đọc bắt buộc

Trước khi chỉnh sửa, main agent và mọi subagent phải hiểu rằng
`PROJECT_CONSTITUTION.md` là authority cao nhất. Main agent phải tự đọc toàn bộ
các file sau; không giao việc đọc và diễn giải instruction cho subagent:

1. `PROJECT_CONSTITUTION.md`;
2. `AGENTS.md` áp dụng cho workspace;
3. `docs/product/user-requirements.md`;
4. `docs/implementation-roadmap.md`;
5. `docs/agent-execution-plan.md`, đặc biệt G3;
6. `docs/agent-work-packages.yml`, PG-301 đến PG-315;
7. `docs/architecture.md`;
8. `docs/threat-model.md`;
9. `docs/receipt-contract.md`;
10. `docs/reviews/2026-08-13-prompt-02-implementation.md`;
11. `docs/reviews/2026-08-13-g2-preflight-git-ref-discovery.md`;
12. schemas, source và tests đang tồn tại.

Nếu instruction hoặc implementation thực tế mâu thuẫn với prompt này, ưu tiên
constitution, AGENTS, live source và executable tests. Ghi lại divergence vào
báo cáo; không âm thầm viết lại contract.

## 3. Baseline phải kiểm tra lại

Baseline gần nhất ngày 2026-08-13:

- workspace chưa phải Git repository;
- chưa có public remote, Action hoặc live pilot;
- G0 chưa có maintainer authorization/live evidence;
- G1 locally verified;
- G2 local implementation slice có local-file/Git-ref preflight, init,
  validate, doctor, discovery classification và fixture repositories;
- 49 non-CLI tests pass;
- 4 CLI process tests pass;
- 50 executable evaluator fixture/oracle entries;
- 11 security tests;
- `npm audit --audit-level=high` báo 0 vulnerability;
- `docs/agent-work-packages.yml` có 96 packages và không có dependency cycle.

Main agent phải chạy audit đầu vào và ghi actual baseline. Nếu test count hoặc
file state đổi, dùng số hiện tại. Không sửa historical report chỉ để đồng bộ số
liệu mới.

## 4. Ranh giới quyền và hành động bên ngoài

Prompt này cho phép chỉnh sửa local source, tests, fixtures và docs trong
workspace. Prompt này không tự cấp quyền:

- init Git;
- chọn license;
- tạo public repository hoặc remote;
- push;
- mở, merge hoặc comment PR;
- cài GitHub App/Action;
- đổi branch protection hoặc ruleset;
- mời/contact người dùng;
- dùng private repository hoặc token ngoài phạm vi được maintainer xác nhận;
- lưu recorded fixture chứa dữ liệu riêng tư hoặc credential.

Không suy ra authorization từ việc `gh auth status` đang xanh. Live read-only
smoke là một external API action: trước khi chạy, phải có exact owner/repo,
pull/merge-group target, credential source, permission scope và sự cho phép rõ
ràng. Nếu chưa có, hoàn thành toàn bộ mock/recorded-local work, tạo exact live
smoke command/protocol, rồi ghi G3 `mock_verified_live_smoke_pending`.

Không được dùng external write để “thử cho biết”. Không đăng check run, comment,
status, artifact hoặc workflow result trong Prompt 4.

## 5. Multi-agent orchestration bắt buộc

Main agent là editor duy nhất. Tạo đúng ba subagents read-only ngay sau baseline
audit. Nếu hệ thống chỉ cho phép ít slot hơn, chạy theo wave nhưng giữ đủ ba vai
trò. Mỗi subagent phải trả findings với severity P0/P1/P2, exact file/contract,
reproduction hoặc missing test, và recommended acceptance criterion.

### Subagent A — GitHub API và provenance reviewer

Phạm vi:

- endpoint/API version và field availability;
- target identity cho pull request và merge group;
- base contents, files pagination, reviews, checks, workflows, rulesets,
  branch protection, teams và collaborator permissions;
- endpoint limits và permission requirements;
- REST/GraphQL trade-off cho linked issues;
- source/revision/response digest provenance.

Read-only. Không sửa file. Phải dùng nguồn GitHub chính thức và đánh dấu field
nào là documented, field nào là inference.

### Subagent B — security, TOCTOU và privacy reviewer

Phạm vi:

- hostile PR boundary;
- base-policy self-relaxation;
- wrong SHA, fork confusion, merge-group confusion;
- check/workflow spoofing và duplicate ambiguity;
- privilege/permission downgrade;
- pagination truncation;
- retry/rate-limit abuse;
- cache identity bleed;
- TOCTOU re-read;
- secrets, PR body/comment, emails, token và PII leakage;
- fail-closed behavior theo dependency.

Read-only. Không sửa file.

### Subagent C — contract, fixtures và delivery reviewer

Phạm vi:

- mapping raw API fixtures vào existing `EvaluationInput`;
- schema/type compatibility;
- deterministic digests;
- fixture oracle completeness;
- test enumeration và no-orphan rule;
- human/JSON capability diagnostics;
- performance/abuse budgets;
- documentation claims và G3 gate evidence.

Read-only. Không sửa file.

### Review loop

1. Main agent nhận audit ban đầu của cả ba subagents.
2. Main agent tổng hợp một findings ledger và tự triển khai theo slices.
3. Sau mỗi major slice, gửi evidence/diff summary lại subagent phù hợp để
   targeted re-review.
4. Trước final, cả ba subagents phải re-review current state.
5. Main agent sửa mọi P0/P1 trong scope rồi yêu cầu re-review lại.
6. Chỉ dừng khi không còn P0/P1 trong phần local/mock có thể hoàn thành, hoặc
   blocker đòi maintainer/external state được ghi exact.

Subagent không được commit, edit hoặc chạy external write. Main agent không được
dùng kết luận subagent thay cho việc tự đọc instruction và tự kiểm chứng.

## 6. Quy tắc làm việc dài hạn

Đây là prompt triển khai dài. Agent phải tiếp tục qua các phase và checkpoint,
không trả final chỉ vì:

- đã tạo plan;
- đã tạo folder `src/github`;
- một test happy path pass;
- token/repository cho live smoke chưa được cung cấp;
- context sắp compact;
- một subagent vẫn còn finding có thể sửa local;
- build xanh nhưng integration fixtures chưa đủ.

Khi context compact, tiếp tục từ working tree và report/checkpoint hiện có;
không restart. Sau mỗi slice, giữ build/typecheck/test xanh. Nếu một phase bị
block bởi external authority, chuyển sang mọi phase local độc lập còn lại.

Chỉ hỏi maintainer khi lựa chọn sẽ thay đổi external state hoặc product
contract đáng kể. Không hỏi lại những gì có thể xác định an toàn từ source,
tests hoặc official docs.

## 7. Nghiên cứu nguồn chính thức trước implementation

Trước khi chốt adapter contract, đối chiếu tài liệu GitHub hiện hành. Chỉ dùng
official GitHub docs cho normative API behavior. Ít nhất phải kiểm tra:

- Pull requests và list files, gồm 3,000-file maximum;
- repository contents với exact `ref`/base SHA;
- check runs for a Git reference, pagination, App identity và 1,000-suite
  limitation;
- workflow runs, `workflow_id`, `run_attempt`, event và `head_sha`;
- pull-request reviews, chronological order, state và `commit_id`;
- collaborator repository permission;
- team identity/membership/visibility và organization permission;
- rulesets và branch protection;
- REST pagination qua `Link` headers;
- primary/secondary rate limits, `retry-after`, reset headers và bounded retry;
- authenticated conditional requests/ETag;
- `merge_group: checks_requested` target SHA semantics;
- REST/GraphQL support cho closing/linked issues.

Re-check API version header thay vì hard-code từ memory. Pin một supported API
version trong adapter và document upgrade rule. Nếu GitHub docs không đủ để
prove một mapping, trả `unknown`, `unsupported` hoặc permission/capability gap;
không parse URL/HTML/body để tạo verified evidence.

Prompt authoring baseline tham khảo official docs ngày 2026-08-13:

- `https://docs.github.com/en/rest/pulls/pulls`;
- `https://docs.github.com/en/rest/repos/contents`;
- `https://docs.github.com/en/rest/checks/runs`;
- `https://docs.github.com/en/rest/actions/workflow-runs`;
- `https://docs.github.com/en/rest/pulls/reviews`;
- `https://docs.github.com/en/rest/collaborators/collaborators`;
- `https://docs.github.com/en/rest/teams/members`;
- `https://docs.github.com/en/rest/repos/rules`;
- `https://docs.github.com/en/rest/branches/branch-protection`;
- `https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api`;
- `https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api`;
- `https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api`;
- `https://docs.github.com/en/webhooks/webhook-events-and-payloads#merge_group`.

Trong implementation report, ghi source ledger gồm URL, access date, endpoint,
permission, documented cap và code/tests chịu ảnh hưởng. Không copy dài tài
liệu; tóm tắt behavior cần thiết.

## 8. Kiến trúc bắt buộc

Giữ một TypeScript repository và một public package. Không tạo microservice,
database, queue, dashboard, webhook server hoặc GitHub App service trong G3.

Kiến trúc mục tiêu:

```text
src/github/
  api-types.ts              raw narrow response types, no any
  client.ts                 injected read-only transport
  request-budget.ts         request/page/retry/rate-limit accounting
  pagination.ts             bounded Link-header traversal
  retry.ts                  classified bounded retry
  identity.ts               repository/PR/target resolution
  contents.ts               exact-revision raw content retrieval
  changed-paths.ts          complete/capped normalized paths
  linked-issues.ts          verified native linkage only
  checks.ts                 check-run candidates and App identity
  workflows.ts              immutable workflow-run provenance
  reviews.ts                current review state and freshness
  permissions.ts            immutable actor/team qualification
  codeowners.ts             base source and declared conformance subset
  rulesets.ts               native ruleset normalization
  branch-protection.ts      fallback/native protection normalization
  capabilities.ts           per-observation permission/support state
  redaction.ts              allowlist serialization and log safety
  cache.ts                  optional identity-safe conditional cache
  toctou.ts                 final target identity re-read
  snapshot-builder.ts       orchestration into EvaluationInput

fixtures/api/
  manifest.json
  ... raw request/response fixture families ...

test/integration/
  github-client.test.ts
  github-identity.test.ts
  github-policy.test.ts
  github-pagination.test.ts
  github-checks-workflows.test.ts
  github-reviews-permissions.test.ts
  github-codeowners-rulesets.test.ts
  github-snapshot.test.ts
  github-toctou.test.ts
  github-redaction.test.ts
```

Có thể điều chỉnh tên file nếu current source hợp lý hơn, nhưng separation phải
giữ nguyên. Không đặt network/filesystem/time vào pure evaluator. Không để raw
GitHub payload lan sang evaluator.

### Dependency direction

```text
raw GitHub response
  -> narrow boundary validation
  -> normalized observation group
  -> complete EvaluationInput
  -> existing contract validator
  -> existing deterministic evaluator
```

Evaluator không gọi GitHub. GitHub client không tự quyết định final status.
Snapshot builder không bỏ qua validation trước khi trả snapshot.

### Slice-0 contract compatibility decision

Current contract phải được kiểm tra trước khi adapter code bắt đầu. Hai gap đã
biết không được né:

1. current `EvaluationInput`/evaluator có thể chỉ tạo requirement từ
   `PatchgatePolicy`; một `PolicySource(kind=ruleset|branch_protection)` tự nó
   không tạo native requirement;
2. current repository identity có scalar pull-request number, trong khi một
   merge group có thể chứa nhiều PR.

Main agent phải viết ADR và chọn một trong hai outcome cho từng gap:

- **Versioned contract extension:** mở rộng schema/types/validator/evaluator/
  receipt cho normalized native requirements hoặc merge-group identity +
  authenticated membership, bump đúng schema namespace khi wire shape thay
  đổi, migrate fixtures, giữ backward compatibility theo documented rule; hoặc
- **Explicit fail-closed limitation:** implement executable
  `unsupported`/`policy_ambiguous` result và giữ package/G3 `partial`.

Không được dịch ruleset/branch protection âm thầm thành `patchgate.yml` rule.
Không được chọn một PR tùy ý từ merge group. Merge-group happy path trong
fixture matrix chỉ bắt buộc nếu versioned group-membership contract được
implement; nếu chưa, thay bằng executable multi-PR/unknown-membership
unsupported oracle và không claim merge-queue support.

Native controls chỉ được gọi implemented khi normalized requirement thực sự đi
vào decision/receipt với authority và remediation, không phải chỉ có source
metadata. Contract extension phải giữ six rule classes và status semantics,
đồng thời chạy lại toàn bộ G1 compatibility/determinism/security suite.

## 9. Transport boundary

Tạo một read-only injected transport đủ nhỏ để mock chính xác:

```ts
interface GitHubReadTransport {
  request(input: GitHubRequest): Promise<GitHubResponse<unknown>>;
}
```

Contract thực tế có thể khác, nhưng phải có:

- method chỉ thuộc allowlist read-only (`GET`, có thể `POST` cho GraphQL query
  read-only nếu được justify);
- GraphQL POST chỉ nhận allowlisted operation ID; query text là constant trong
  source, variables được schema-validate và bound; không nhận query document,
  endpoint, field selection hoặc operation name từ contributor/caller tùy ý;
- URL/path template và parameters tách biệt;
- explicit API version, Accept và User-Agent;
- response status, selected safe headers và raw unknown body;
- timeout/abort;
- response byte cap;
- không log Authorization;
- không nhận arbitrary full URL từ untrusted payload;
- không follow pagination link sang host khác;
- disable automatic redirect (`redirect: error` hoặc manual reject); mọi 3xx là
  stable diagnostic, Authorization không bao giờ forward sang request thứ hai;
- validate HTTPS scheme, exact configured API host/port, no userinfo; GitHub.com
  và future GHES origin partitions không dùng chung credential/cache;
- injectable clock/sleeper cho retry tests;
- deterministic mock transport;
- stable diagnostic ID cho malformed response.

Production TypeScript strict mode, không `any`, không unsafe cast trực tiếp từ
network vào normalized types. Parse `unknown` bằng boundary guards/validators.

Ưu tiên built-in `fetch` nếu đủ. Chỉ thêm runtime dependency khi có ADR ngắn
giải thích lợi ích, security/cost và package impact. Không thêm SDK chỉ vì tiện.

## 10. Request, pagination và retry budget

Mọi request phải cập nhật budget evidence:

```text
requests attempted/succeeded/failed
pages per observation group
retries by classified reason
response bytes
primary rate remaining/reset/resource
retry-after observed
conditional requests and 304 reuse
caps or truncation encountered
```

Đặt bounded defaults và cho test override. Không dùng wall-clock threshold dễ
flaky. Required invariants:

- serial hoặc explicitly bounded requests;
- max requests toàn snapshot;
- max pages mỗi collection;
- max retries mỗi request và toàn snapshot;
- max delay cho một retry và max cumulative sleep toàn snapshot;
- max response bytes;
- max normalized items theo core bounds;
- pagination chỉ theo parsed `Link rel=next` cùng trusted API origin;
- next-link loop bị reject;
- repeated page/item identity không tạo duplicate pass;
- 403/404 không tự động đồng nghĩa resource absent;
- 429/secondary rate limit honor `retry-after` hoặc reset;
- malformed, negative, past hoặc far-future `retry-after`/reset bị bound; vượt
  single/cumulative sleep budget thì trả stable rate-limit diagnostic, không
  block agent trong một sleep dài;
- retry exhaustion trở thành stable incomplete/capability diagnostic;
- 401 không retry;
- schema/malformed response không retry;
- 5xx/network timeout chỉ retry theo bounded policy;
- no random jitter trong deterministic tests; injectable strategy.

Dành một **finalization reserve** không thể bị collection/retry tiêu thụ. Reserve
phải đủ cho mandatory target re-read và revalidation của mọi selected mutable
evidence/native policy. Nếu reserve không đủ hoặc finalization request thất bại,
builder trả `rejected`; không trả built snapshot với revalidation bị bỏ qua.

Budget overflow phải dừng collection, đánh dấu `complete=false`, cung cấp
remediation và không tạo green cho requirement phụ thuộc collection đó.

## 11. Snapshot identity — PG-301

Tạo immutable identity object trước mọi collection:

- repository numeric ID nếu API cung cấp;
- owner/name normalized nhưng vẫn giữ display values khi cần;
- pull-request numeric ID và number;
- event kind: `pull_request` hoặc `merge_group`;
- base ref và base SHA;
- head repo ID, head ref và head SHA;
- optional merge SHA;
- merge-group SHA;
- `targetKind`;
- exact `testedSha` derived theo event/config;
- retrieval start timestamp;
- authentication/capability kind không chứa token.

Decision-bearing provenance envelope/digest phải bind API origin, immutable
repository ID, immutable PR ID/node ID hoặc merge-group identity/event ID,
event kind và normalized owner/name/number. Nếu current receipt không chứa các
field này, xử lý qua versioned contract extension ở Slice 0; không giữ chúng chỉ
trong debug metrics. Rename/name reuse hoặc same owner/name/number với numeric
ID khác phải reject và không được cache reuse.

Invariants:

- `targetKind=head` thì `testedSha=headSha`;
- `targetKind=merge` thì `testedSha=mergeSha` và merge SHA phải tồn tại;
- `targetKind=merge_group` thì `testedSha=mergeGroupSha`;
- base policy revision luôn `baseSha`, không phải head/tested SHA;
- fork head repository không được thay base repository identity;
- PR number/repository/event không lấy từ PR body hoặc contributor-provided
  arbitrary string;
- inconsistent event/API identity bị reject trước collection;
- merge-group payload thiếu stable mapping cần thiết phải unsupported/unknown,
  không giả thành pull request.
- merge group chứa nhiều PR chỉ được evaluate nếu contract lưu authenticated
  membership và semantics được định nghĩa; không parse temporary ref/head_ref
  để chọn scalar PR.
- ADR phải chỉ ra documented read-only mechanism để re-read group identity/
  membership (for example an authenticated event/API/ref resolution supported
  by current GitHub docs); nếu không có mechanism đủ mạnh, return unsupported.

Test identity trước khi tiếp tục endpoint khác.

## 12. Trusted base policy — PG-302

Fetch `patchgate.yml` bằng repository contents/blob API với exact `baseSha`.
Không fetch default branch name rồi hy vọng SHA không đổi. Không fetch head.

Required behavior:

- preserve exact raw bytes;
- validate response type, encoding, size và requested identity;
- derive raw digest và normalized contract digest qua trusted artifact
  constructor hiện có;
- record source identity, base SHA, response digest và retrieval metadata;
- missing structured policy không trở thành empty green policy;
- 404 có thể là true absence chỉ khi permission/capability đủ và endpoint
  semantics đã được chứng minh;
- 403/hidden 404/invalid encoding/oversize/malformed content tạo
  `policy_ambiguous` hoặc boundary diagnostic phù hợp;
- policy thay đổi ở head không áp dụng cho PR đó;
- changed-path observation có thể báo policy change, nhưng authority vẫn base;
- response payload/meta mutation không qua digest validation.

Test tampering: đổi raw policy, normalized policy, base SHA, digest hoặc source
identity độc lập đều không được green.

## 13. Changed paths — PG-303

List files phải paginate đến khi:

- hết `rel=next` và collection complete;
- gặp documented GitHub 3,000-file ceiling;
- gặp local page/item/byte/request cap;
- permission/rate/error khiến collection incomplete.

Normalize ít nhất path và status cần cho evaluator; không lưu patch/diff body.
Reject empty/absolute/traversal/NUL path. Canonicalize set deterministically,
detect duplicates và preserve rename semantics đủ để policy/path ownership
không bỏ sót old/new path.

3,000-file ceiling hoặc bất kỳ truncation nào phải `complete=false`; không được
dùng first 3,000 paths để kết luận “không có sensitive path”. Reviewability có
thể báo cap nhưng không được gọi full count.

Fixture cần multi-page, duplicate boundary, rename, generated-heavy, exact cap,
over cap, missing Link, cyclic Link, foreign-host Link và mid-pagination error.

## 14. Linked issues — PG-304

Chỉ native/authenticated relationship mới là verified linkage. PR body regex,
title, branch name, comment hoặc plain `#123` là discovery clue.

Main agent phải nghiên cứu current GitHub REST/GraphQL contract. Nếu dùng
GraphQL `closingIssuesReferences` hoặc native equivalent:

- validate repository immutable identity và issue number/ID;
- paginate connection đầy đủ;
- record GraphQL errors/partial data;
- missing permission/field/support tạo incomplete/unsupported;
- complete+sufficient+zero native links là confirmed failure khi rule required;
- incomplete/insufficient cannot become confirmed zero;
- current v0.1 policy schema chỉ hỗ trợ verified same-repository linkage; a
  cross-repository link remains advisory/unsupported unless a deliberate
  versioned policy-schema extension is designed and tested;
- do not store issue body/title unless demonstrably required; default exclude.

Nếu GitHub API không chứng minh mọi loại “linked issue” mà product copy đang
hứa, thu hẹp supported behavior và document chính xác; không bù bằng regex.

## 15. Checks và workflows — PG-305

Collect all eligible check-run candidates cho exact `testedSha`, không chỉ
`latest` nếu selection semantics cần thấy ambiguity. Respect documented suite
limit và mark incomplete khi không thể prove full candidate set.

Normalized check evidence cần:

- exact name;
- status và conclusion;
- tested SHA;
- immutable check-run ID;
- App numeric ID, optional slug display only;
- source strength;
- check suite identity nếu dùng để correlate;
- retrievedAt audit timestamp;
- workflow ID/path, run ID, positive run attempt, event và head SHA khi source
  là GitHub Actions workflow;
- response/provenance digest ở observation layer.

Không parse `details_url` để tạo immutable workflow identity. Chỉ correlate
check ↔ workflow khi official fields/endpoints chứng minh relation. Nếu không
prove được, evidence không được thỏa `github_actions_workflow` policy.

Selection invariants:

- candidate resolution xảy ra trên toàn bộ eligible collection trước pass;
- wrong SHA, wrong App, wrong workflow, wrong event hoặc wrong attempt không
  thỏa rule;
- duplicate checkRunId hoặc duplicate workflow run identity reject;
- hai eligible runs success/failure hoặc success/pending là ambiguous trừ khi
  explicit immutable rerun selector được contract hóa;
- stale/foreign candidate cộng một valid candidate không tự tạo ambiguity nếu
  foreign candidate bị loại bởi exact identity;
- completed thiếu conclusion reject;
- non-completed không pass;
- Action evidence không được giả thành distinct PatchGate App evidence;
- workflow run phải match `workflow_id/path`, `run_id`, `run_attempt`, event và
  exact target SHA.

Check↔workflow correlation phải dùng documented immutable join, gồm repository
identity và check-suite/workflow-run relation khi API cung cấp, không chỉ cùng
SHA/name/path/event. Nếu relation không prove được giữa một check run và đúng
workflow run/attempt, trả unknown. Test hai workflow/run cùng SHA/name/path nhưng
khác check suite; heuristic join không được pass.

Native required commit status contexts cũng phải được nghiên cứu. Nếu Ruleset
hoặc branch protection có thể yêu cầu legacy commit status thay vì Check Run,
hãy normalize combined/status evidence với documented creator/source limits,
hoặc trả unsupported/ambiguity. Same-name Check Run không tự thỏa native commit
status requirement; foreign creator cùng context không được trusted.

## 16. Reviews và qualification — PG-306/PG-307

List toàn bộ reviews theo documented chronology, paginate đầy đủ, rồi derive
current normalized review state per immutable `actorId`. Không đếm mọi record
`APPROVED` lịch sử.

Required behavior:

- same actor with login casing changes counts once;
- later `CHANGES_REQUESTED`/`DISMISSED` invalidates old approval;
- review must bind configured target commit/freshness semantics;
- author review does not qualify;
- bot does not qualify;
- `qualified=true` chỉ khi authenticated repository permission và, nếu policy
  yêu cầu team, immutable team ID + active membership + team/repository
  capability được chứng minh;
- bare login/team slug không đủ;
- hidden team/403/404 ambiguity becomes permission unknown;
- collaborator permission endpoint gives effective permission; document role
  threshold used for qualification;
- custom role and mapped legacy permission handling must be explicit;
- team identity must not rely on mutable display name;
- membership `pending` does not qualify;
- incomplete review collection or qualification observation cannot green a
  dependent human gate;
- requirements not depending on review/ownership are not blocked solely by
  missing team permission.

Qualification phải có principal-binding object/relation rõ ràng:
`configuredPrincipal`, `kind`, immutable `actorId` hoặc `teamId`, source,
revision/completeness và selected review reference. Referential validation phải
chứng minh đúng configured owner; một unrelated `teamId` không được làm team
slug trùng tên trở thành qualified. Nếu wire contract hiện chỉ giữ string
principal, xử lý bằng versioned extension hoặc giữ unknown.

Do not store review bodies/comments. Receipt may retain actor ID/login only as
already required by contract; report privacy trade-off.

## 17. CODEOWNERS — PG-308

Fetch CODEOWNERS từ base SHA theo GitHub search order supported by current docs:
`.github/CODEOWNERS`, root `CODEOWNERS`, then `docs/CODEOWNERS`, unless official
behavior has changed. Record exact selected identity, base revision, raw digest
and response digest.

Do not claim full GitHub conformance without executable evidence. Either:

1. implement and test a declared safe subset, returning unsupported for syntax
   outside subset; or
2. use a vetted parser with ADR, conformance fixtures, license/security review
   and known limitations.

At minimum test comments, whitespace, escaped spaces, negation behavior,
directory/glob semantics, later-rule precedence, team/user owners, invalid
lines, duplicates, Unicode/path semantics và absent file. Preserve byte/code-
point identity consistent với documented GitHub behavior; không tự NFC/NFD
normalize, collapse literal path segments hoặc “fix” confusables. Khi official
semantics cho `!`, `[]`, Unicode hoặc escaped path không prove được, return
unsupported/unknown thay vì đoán.

Ownership cannot pass if changed paths incomplete. Team owner cannot qualify
without immutable team/membership evidence. Missing CODEOWNERS when structured
policy depends on it is ambiguity/evidence missing, not empty ownership.

## 18. Rulesets và branch protection — PG-309

Normalize native controls with explicit source identity and applicability to
the base branch/target. Distinguish:

- repository rulesets;
- organization/inherited rulesets when visible;
- active/evaluate/disabled enforcement state;
- branch protection fallback;
- required checks and expected source App;
- required approvals, CODEOWNERS review and last-push review;
- bypass actors/roles/apps when visibility is available;
- capability gap when inherited/effective rule cannot be fully observed.

Do not merge rulesets and branch protection bằng “strongest-looking rule”
without documented precedence. Do not treat inaccessible rule data as no rule.
Native controls can create enforceable requirements only when authenticated,
applicable, complete and normalized under documented semantics.

If exact effective-rules computation cannot be implemented safely in G3,
return `unsupported`/`policy_ambiguous`, document limitation and keep extension
point. False unknown is preferable to false green.

Fixtures phải có overlapping applicable rulesets + branch protection,
`active`/`evaluate`/disabled enforcement, unsupported rule type/condition,
required-last-push approval thiếu last-pusher identity, hidden bypass actors và
ruleset mutation during build. Effective controls incomplete hoặc unknown rule
có thể ảnh hưởng decision không được silently ignored.

## 19. Error, permission, capability và budget semantics — PG-310/PG-313/PG-314

Define stable diagnostic taxonomy. At minimum:

```text
GITHUB_AUTH_REQUIRED
GITHUB_AUTH_INVALID
GITHUB_PERMISSION_INSUFFICIENT
GITHUB_RESOURCE_NOT_VISIBLE
GITHUB_RATE_LIMITED
GITHUB_RETRY_EXHAUSTED
GITHUB_TIMEOUT
GITHUB_RESPONSE_MALFORMED
GITHUB_RESPONSE_TOO_LARGE
GITHUB_PAGINATION_LIMIT
GITHUB_ITEM_LIMIT
GITHUB_API_UNSUPPORTED
GITHUB_TARGET_CHANGED
GITHUB_IDENTITY_MISMATCH
GITHUB_PROVENANCE_AMBIGUOUS
GITHUB_CACHE_IDENTITY_MISMATCH
```

Map each diagnostic to:

- affected observation/requirement;
- `complete`;
- `permissionState`;
- retryability;
- user-safe message;
- precise remediation;
- whether snapshot remains evaluable;
- CLI exit contract.

PG-314 closure additionally requires executable assertions for snapshot-level
request, page, retry, response-byte and rate-limit budgets. A metrics object
that is merely emitted but never checked against hard bounds is not evidence
that PG-314 is implemented.

Do not turn every missing API permission into a global blocker. Use
dependency-aware completeness: missing checks permission blocks only required
check evaluation; missing review/team data blocks only human/ownership gates.
Policy source and target identity remain core authority inputs.

`doctor`/capability view phải nói rõ:

- credential kind without token value;
- repository/target identity;
- endpoint capabilities checked;
- permissions sufficient/insufficient/unknown;
- unsupported GitHub.com/GHES behavior;
- smallest safe remediation;
- no claim that ruleset/configuration was changed.

## 20. Coherent snapshot và TOCTOU — PG-311

Start/end SHA comparison là cần thiết nhưng không đủ. Reviews, dismissal,
permission/team membership, linked issues, checks, workflow conclusions,
rulesets và branch protection có thể đổi trong khi base/head SHA giữ nguyên.
Pagination cũng có ABA risk: target A→B→A có thể làm pages thuộc hai thế hệ bị
trộn dù start/end cùng A.

Snapshot build phải có coherent-generation protocol:

1. resolve immutable repository/event/target identity at start;
2. collect observations against exact immutable SHAs với per-page/per-response
   ETag, Last-Modified, response digest hoặc documented immutable revision;
3. retain provenance token cho every decision-bearing page/item selected;
4. use reserved finalization budget;
5. re-read current PR/merge-group identity at end;
6. revalidate every mutable dependency actually used: selected checks/workflow
   runs, current reviews/dismissals, collaborator/team qualification, linked
   issues, applicable rulesets/branch protection and every mutable collection
   page that lacks immutable revision;
7. compare repository/PR/group IDs, membership, base/head/merge/group SHAs,
   targetKind, testedSha and provenance tokens;
8. only then mark observations complete and return built input.

Revalidation may use conditional requests/ETag or targeted immutable endpoint
reads, but must prove unchanged semantics. A 304 is usable only with correct
authenticated cache identity and matching stored body digest. Nếu endpoint
không thể prove coherence, affected group stays incomplete or builder rejects.

Do not “patch” old observations with new data. Stable diagnostics
`GITHUB_TARGET_CHANGED` hoặc `GITHUB_PROVENANCE_AMBIGUOUS` phải yêu cầu full
re-evaluation. Test:

- head push, base advance, force-push, merge SHA replacement, PR closed/merged;
- approval dismissed after review fetch with unchanged SHA;
- selected check conclusion/source changes after fetch;
- team membership/permission removed;
- linked issue relation changes;
- ruleset/branch protection relaxed or bypass visibility changes;
- A→B→A while changed-path pages are collected;
- exact collection budget exhaustion immediately before finalization;
- unchanged control case.

All mutation cases must never green. Final checks consume only the reserved
finalization budget; retries cannot consume reserve. Failure to execute every
mandatory final check is `rejected`, not built-incomplete masquerading as a
validated snapshot. Retry loop remains bounded when state changes repeatedly.

## 21. Redaction và data minimization — PG-312

Use allowlist serialization. Không đưa các field sau vào normalized snapshot,
logs, fixtures hoặc report trừ khi contract chứng minh cần thiết:

- Authorization/token/cookie;
- PR body/comment/review body;
- issue body/title;
- email;
- raw error response có thể echo credential/private data;
- arbitrary URLs/query strings chứa secret;
- workflow logs/artifacts;
- full user profile;
- repository secrets/variables;
- private file content ngoài fixed policy/CODEOWNERS inputs.

Add recursive redaction tests with nested headers, mixed casing, URL query,
GraphQL errors and unexpected raw response. Snapshots/reports must be safe to
attach as support artifacts within documented limitations.

Test that debug mode cannot bypass redaction. Fixture recording process must
sanitize before write and include a validator that rejects forbidden keys or
patterns.

Secret redaction và safe rendering là hai lớp khác nhau. Contributor-controlled
allowlisted strings như path, ref, check name, workflow name và login phải có
size/control-character validation. Human/CI/Markdown rendering phải escape
CR/LF, ANSI ESC, bidi controls, HTML/Markdown và directive-like syntax để dữ
liệu không forge log line, annotation hoặc Codex directive. JSON giữ exact safe
data contract nhưng không chứa disallowed controls. Add terminal/log injection
fixtures and assert no forged status/remediation line appears.

## 22. Conditional requests và cache — PG-315

Caching is optional in G3. Không implement persistent cache chỉ để tick box.
Trước tiên viết ADR/evaluation:

- which exact GET endpoints expose ETag/Last-Modified;
- authentication requirement for 304 rate benefit;
- cache key identity;
- invalidation boundary;
- privacy/storage risk;
- whether complexity is justified for `v0.1`.

Nếu implement, cache key phải gồm API origin, repository immutable identity,
endpoint/parameters, auth capability partition, base/tested SHA, API version và
Accept variant. Không reuse across repository, installation, permission scope,
SHA hoặc endpoint. 304 chỉ reuse body khi cache metadata/body digest match.

Cache miss/corruption/identity mismatch phải refetch hoặc fail safely. Không để
cache biến incomplete thành complete. Nếu defer, ghi explicit rationale và
đóng PG-315 ở trạng thái `evaluated_deferred`, không giả implemented.

Fixture obligations là conditional:

- nếu cache implemented: full correct-304, stale-body, body-digest, permission/
  installation/origin/SHA identity mismatch suite;
- nếu deferred: tests prove client sends no conditional headers, performs no
  cache reuse/persistence, and treats unexpected 304 without a validated body
  as a stable rejection.

## 23. Snapshot builder contract

Snapshot builder nhận immutable request descriptor + injected transport,
budgets, clock và policy configuration. Nó trả discriminated result:

```ts
type SnapshotBuildResult =
  | { kind: "built"; input: EvaluationInput; diagnostics: Diagnostic[]; metrics: RequestBudgetEvidence }
  | { kind: "rejected"; diagnostic: Diagnostic; metrics: RequestBudgetEvidence };
```

Exact type có thể khác nhưng phải phân biệt:

- malformed/identity-invalid snapshot không được vào evaluator;
- well-formed incomplete observation vẫn có thể vào evaluator và cho
  `evidence_missing`/`policy_ambiguous`;
- complete snapshots luôn validate bằng existing input schema + semantics;
- builder không inject `evaluatedAt` vào pure decision digest;
- retrievedAt/response metadata không làm semantic digest nondeterministic;
- observation normalized digests được recompute từ normalized items;
- response digests bind exact sanitized response payload/metadata theo contract;
- policy source observation one-to-one với policy source record;
- no collection marked complete when permission insufficient, cursor remains,
  truncation/cap occurs or response failed;
- no empty-policy green.

Add a concrete development-only read-only command/script before local/mock
closure, for example:

```bash
patchgate github snapshot --repo OWNER/REPO --pull 123 --output snapshot.json
```

Exact naming may adapt to current CLI, but process tests and docs are mandatory.
Token chỉ đọc từ documented environment/standard credential provider, không
nhận token positional/flag, không print token, và command không có write
endpoint. Provide an injected mock-transport mode for process fixtures. CLI
taxonomy:

- exit `0`: built and evaluated `ready_for_review` or valid snapshot-only
  success, documented unambiguously;
- exit `1`: built/evaluable snapshot with constitutional non-ready status;
- exit `2`: rejected malformed/unsupported/identity/provenance contract;
- adapter-library fixture without process surface uses `exit: not_applicable`.

Docs phải gọi đây là development/read-only surface cho đến G4. Live execution
may remain authorization-pending, but the callable surface, credential-loading
contract, mock process tests and exact dry protocol cannot be optional.

## 24. Fixture và oracle matrix bắt buộc

Prompt-4-owned roots là `fixtures/api/**`, mọi new raw response fragment dưới
`test/integration/fixtures/**` nếu agent tạo, và mọi Prompt-4-specific invalid/
security fixture dưới `fixtures/security/github/**`. Existing evaluator/CLI
fixtures là legacy shared roots và chỉ exclude bằng explicit documented list;
không copy/chuyển chúng ngầm.

`fixtures/api/manifest.json` phải enumerate mọi owned file/fragment. Assert
bijective coverage theo cả hai chiều:

- every owned fixture/response fragment referenced by one or more manifest
  cases hoặc explicit legacy exclusion;
- every manifest path/reference exists;
- every manifest case executed by test runner;
- every response fragment has at least one semantic assertion;
- unique case IDs và stable request IDs;
- no unasserted leftover page/error body.

Manifest có schema + semantic validator. Oracle là discriminated:

```text
kind=reject:
  diagnosticId, validationOutcome, expectedExit(2 hoặc not_applicable),
  request/page/retry/byte budget, redaction assertions

kind=evaluate:
  observation completeness/permission/diagnostics,
  requirement result + reason IDs,
  final status + reason IDs,
  decision/observation/response digest relations,
  expectedExit(0|1 hoặc not_applicable),
  request/page/retry/byte budget, redaction assertions
```

Không cho phép case vừa reject vừa có receipt/final status. Mỗi case ghi thêm:

- ID;
- PG/UR/TG mapping;
- request sequence;
- expected request/page/retry budget;
- expected build/validation result;
- expected observation completeness/permission;
- expected normalized items/digest relation;
- expected requirement results, final status và stable reason IDs nếu
  evaluable;
- expected diagnostic và exit/not_applicable nếu rejected;
- redaction assertions.

Tối thiểu có các case sau:

1. happy-path pull request on head SHA;
2. merge-target happy path;
3. merge-group authenticated-membership happy path only if versioned contract
   exists; otherwise multi-PR group explicit unsupported oracle;
4. fork PR with read-only capability;
5. base policy exact SHA;
6. policy changed only on head;
7. missing policy complete+sufficient;
8. hidden 404 policy/permission unknown;
9. malformed/base64/oversized policy;
10. changed paths two pages;
11. exactly 3,000 files;
12. more than 3,000/truncated;
13. cyclic or foreign pagination Link;
14. changed-path page 2 failure;
15. rename old/new sensitive path;
16. linked issue verified same repository;
17. complete zero linked issues;
18. GraphQL partial errors/incomplete;
19. body-only issue claim;
20. required check correct head/App;
21. wrong SHA;
22. wrong App ID same slug/name;
23. missing checkRunId;
24. check completed missing conclusion;
25. duplicate checkRunId;
26. success + failure eligible duplicates;
27. success + pending eligible duplicates;
28. stale/foreign + one valid;
29. workflow wrong event;
30. workflow wrong run attempt;
31. workflow missing immutable ID;
32. Action evidence cannot satisfy distinct App policy;
33. old approval superseded by changes requested;
34. dismissed approval;
35. stale approval after head change;
36. author/bot approval;
37. same actor/login casing duplicate;
38. collaborator permission insufficient;
39. team membership active and immutable team ID;
40. team hidden/incomplete/pending;
41. CODEOWNERS missing while required;
42. CODEOWNERS invalid/unsupported syntax;
43. ownership with changed paths incomplete;
44. applicable ruleset complete;
45. inherited ruleset inaccessible;
46. branch protection fallback;
47. 401;
48. 403 permission;
49. primary rate-limit exhaustion;
50. secondary rate limit with retry-after;
51. bounded 5xx recovery;
52. retry exhaustion;
53. malformed JSON/unexpected content-type;
54. oversized response;
55. request/page/item budget exceeded;
56. target changes during build;
57. unchanged TOCTOU control;
58. redaction nested secret fields;
59. conditional 304 correct identity if cache implemented; otherwise unexpected
   304 safe rejection with no cached body;
60. cache identity mismatch if cache implemented; otherwise proof that no cache
   or conditional header is used;
61. observation item/meta mutation;
62. deterministic replay with timestamps changed;
63. policy unused collection permission gap is non-blocking;
64. same gap becomes evidence_missing when policy activates dependency.
65. approval dismissed after collection, same PR SHAs;
66. selected check changes after collection, same PR SHAs;
67. team membership/permission removed after qualification;
68. native rule/branch protection changes during build;
69. changed-path ABA A→B→A mixes pages;
70. finalization reserve exhausted/mandatory revalidation impossible;
71. repository or PR numeric identity changes while names/numbers match;
72. 302 cross-origin and unexpected same-origin redirect, no second credentialed
   request;
73. two workflow runs share SHA/name/path but only one immutable suite relation;
74. required legacy commit status only;
75. foreign creator same status context;
76. overlapping rulesets plus branch protection composition;
77. evaluate/disabled/unknown native rule and hidden bypass actor;
78. merge group with two PRs cannot select arbitrary scalar PR;
79. path/check/login/ref terminal, ANSI, bidi, Markdown/HTML injection;
80. 403 primary-rate exhausted versus secondary limit versus permission;
81. negative/malformed/huge Retry-After and reset-in-past;
82. CODEOWNERS NFC/NFD/confusable/literal-dot-segment semantics;
83. configured team principal with unrelated teamId cannot qualify;
84. mutable linked-issue relationship changes during finalization;
85. selected evidence revalidation matches exact SHA/App/workflow identity.

Có thể thêm case. Không giảm matrix để chạy nhanh.

## 25. Test strategy

Required test layers:

### Unit

- boundary guards;
- pagination parser;
- retry classifier;
- request budget;
- redaction;
- CODEOWNERS subset;
- current-review reduction;
- candidate identity resolution;
- cache key.

### Recorded/mock integration

- full request sequence per fixture;
- exact headers/path/parameters;
- pagination/retry sequence;
- normalized snapshot + semantic validation;
- evaluator result;
- metrics and diagnostics;
- no unexpected request.

### Security

- hostile responses;
- identity swaps;
- duplicate/provenance ambiguity;
- TOCTOU;
- redaction;
- resource exhaustion;
- external host Link rejection;
- token/header logging prevention.

### Determinism

- same sanitized API semantics with different retrieval times gives same
  decision digest;
- set-like page order changes do not change normalized digest where contract
  says order-insensitive;
- decision-bearing response/item changes do change relevant digest;
- request metrics/audit metadata do not silently alter pure evaluator output.

### Live smoke

Only after explicit authorization. Read-only. Must use a disposable or approved
public repository and record:

- exact command without secret;
- repository/PR target;
- credential kind and declared scopes, not token;
- API version;
- request/page counts;
- redacted output;
- expected versus actual capability;
- no external write;
- cleanup requirement, if any.

Live smoke không thay adversarial mock matrix. Mock suite không thay live smoke.

## 26. Performance và abuse acceptance

Add representative maximum-workload tests without hard flaky timing:

- max changed paths/items;
- max checks and workflow candidates;
- max reviews/team qualification lookups;
- max CODEOWNERS rules;
- max pages/requests/retries;
- oversized/malformed payload early rejection.

Instrument comparison/selection work hoặc assert bounded operation counts để
phát hiện accidental O(n²), đặc biệt check candidate resolution, review current
state và CODEOWNERS matching. Wall-clock benchmark có thể report baseline nhưng
không dùng universal performance claim.

## 27. Documentation deliverables

Tạo/cập nhật:

1. `docs/github-adapter-contract.md`;
2. `docs/github-permissions.md`;
3. `docs/github-api-support-matrix.md`;
4. `docs/security/github-adapter-boundary.md` nếu cấu trúc docs phù hợp;
5. `docs/reviews/YYYY-MM-DD-prompt-04-implementation.md`;
6. `docs/implementation-roadmap.md` current checkpoint;
7. `docs/agent-execution-plan.md` current checkpoint;
8. `docs/agent-work-packages.yml` implementation evidence/status;
9. README current-state claim và development commands khi thực sự có;
10. live-smoke protocol/report riêng, không trộn mock evidence.

Docs phải phân biệt:

- documented endpoint behavior;
- local static/unit verification;
- recorded/mock integration verification;
- native local user flow;
- authorized live read-only smoke;
- GitHub Action/shadow/enforcement evidence chưa tồn tại.

Không viết “authenticated provenance verified” nếu chỉ dùng mock token/fixture.
Không viết “supports GitHub merge queue” nếu chưa có merge-group fixtures và
live/recorded evidence tương xứng.

## 28. Work-package closure rules

Không chỉ ghi “PG-301–315 done”. Tạo closure manifest cho từng package:

| Package | Acceptance IDs | UR/TG IDs | Implementation | Test/fixture IDs + commands | Evidence level | Residual gap | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

Evidence level chỉ dùng validation ladder chuẩn:

- `documented`;
- `static_or_fixture_verified` cho unit/recorded/mock integration;
- `native_user_flow_verified` cho authorized live read-only development flow;
- không dùng `live_shadow_verified`, `live_enforcement_verified` hoặc
  `externally_piloted` trong G3 nếu chưa có đúng evidence G4+.

Package status là namespace khác:

- `implemented`;
- `evaluated_deferred`: quyết định defer có ADR và safe behavior;
- `blocked_external_authority`: exact maintainer/repository/token dependency;
- `incomplete`: acceptance còn thiếu.

Normative traceability seed; main agent phải mở rộng thành exact acceptance and
fixture/test IDs, không được xóa mapping:

| PG | Owned contract | Minimum UR mapping | Threat mapping |
| --- | --- | --- | --- |
| PG-301 | repository/PR/event/target identity | UR-002, UR-103, UR-202, UR-205 | TG-13, TG-15 |
| PG-302 | exact-base policy bytes/digests | UR-103, UR-202, UR-304, UR-306 | TG-01, TG-02 |
| PG-303 | complete changed paths/caps | UR-105, UR-203, UR-301, UR-303 | TG-12 |
| PG-304 | native linked issues | UR-102, UR-105, UR-203, UR-306 | body-only negative case |
| PG-305 | checks/workflows/source | UR-104, UR-105, UR-203, UR-204, UR-205 | TG-03, TG-04, TG-05, TG-13 |
| PG-306 | current/fresh reviews | UR-104, UR-105, UR-202 | TG-09, TG-10 |
| PG-307 | actor/team qualification | UR-105, UR-201, UR-202 | TG-10, TG-11 |
| PG-308 | base CODEOWNERS | UR-103, UR-202, UR-203, UR-208 | TG-11, TG-12 |
| PG-309 | effective native controls | UR-103, UR-201, UR-204, UR-208 | TG-14, TG-16 |
| PG-310 | API failure/retry | UR-105, UR-201, UR-203, UR-303 | rate/permission cases |
| PG-311 | coherent snapshot/TOCTOU | UR-202, UR-203, UR-305, UR-306 | TG-02, TG-15 |
| PG-312 | redaction/minimization | UR-304, UR-407 | TG-08 |
| PG-313 | capability diagnostics | UR-004, UR-105, UR-201, UR-207 | TG-11, TG-14 |
| PG-314 | request/page/retry budget | UR-301, UR-302, UR-303 | TG-12 |
| PG-315 | conditional/cache decision | UR-302, UR-305, UR-306 | cache identity cases |

Nếu một UR/TG không thuộc scope của package, closure row phải ghi explicit
`out_of_scope` + owner package; không để trống. Mỗi acceptance phải có executable
test/fixture ID và command, không chỉ prose/report link.

PG-301–314 không complete từ docs alone. PG-315 có thể
`evaluated_deferred` nếu cache không đáng làm và no-cache behavior an toàn.

G3 only complete khi mọi exit evidence trong roadmap tồn tại, gồm authorized
live read-only smoke. Nếu chưa có authority, report chính xác:

```text
G3 local/mock implementation: complete or partial
G3 live gate: pending maintainer authorization
G3 overall: not complete
```

## 29. Slice plan và checkpoint commands

Main agent triển khai theo thứ tự sau, giữ green sau mỗi slice:

### Slice 0 — baseline và research contract

- audit;
- official source ledger;
- architecture decision;
- spawn subagents;
- tạo ngay `docs/reviews/YYYY-MM-DD-prompt-04-implementation.md` làm durable
  findings/checkpoint ledger;
- append sau mỗi slice: status, files, commands, counts, open PG/UR/TG IDs,
  subagent findings và next restart point;
- update ledger trước mỗi compaction, pause hoặc follow-up dài;
- no edit ngoài report/plan nếu contract chưa rõ.

### Slice 1 — boundary infrastructure

- API narrow types/guards;
- transport;
- pagination;
- retry;
- request budget;
- redaction base;
- unit tests.

### Slice 2 — identity và trusted base

- PG-301/302;
- policy/base fixtures;
- identity invariants;
- semantic input validation.

### Slice 3 — changed paths và linked issues

- PG-303/304;
- pagination/cap fixtures;
- GraphQL partial-data semantics;
- policy-change base/head tests.

### Slice 4 — checks/workflows

- PG-305;
- complete candidate resolution;
- immutable App/workflow binding;
- ambiguity/security tests.

### Slice 5 — reviews/qualification/CODEOWNERS

- PG-306/307/308;
- current-state reducer;
- permission/team qualification;
- CODEOWNERS conformance subset;
- ownership dependencies.

### Slice 6 — native controls và capabilities

- PG-309/310/313/314;
- rulesets/branch protection;
- error/permission matrix;
- metrics/budgets;
- doctor/capability output.

### Slice 7 — full builder, TOCTOU, cache decision

- PG-311/312/315;
- full fixtures;
- deterministic replay;
- redaction;
- cache ADR/implementation.

### Slice 8 — closure

- `npm run verify`;
- `npm run build`;
- current/new scripts cho schema, evaluator fixture, determinism, security,
  GitHub unit/integration, redaction và snapshot process tests;
- `npm audit --audit-level=high`;
- YAML strict parse/dependency graph;
- Markdown internal links;
- fixture manifest bijection;
- subagent final re-review;
- fix all local P0/P1;
- live smoke if authorized;
- final report and exact gate status.

Nếu package scripts chưa có cho GitHub/integration/redaction/bijection, agent
phải thêm scripts rõ tên và đưa chúng vào authoritative `verify` hoặc
`verify:all`. Closure report ghi từng command, exit code, test/file/case count
và timestamp. “Full suite pass” không có command/count không phải evidence.

Checkpoint commands phải dựa trên current package scripts. Có thể thêm scripts
như `test:integration`, `test:github`, `test:redaction`, `verify:fixtures`, nhưng
`npm run verify` cuối cùng phải bao phủ relevant local suite hoặc docs giải thích
rõ script tổng hợp nào là authoritative.

## 30. Invariants không được phá

- TypeScript strict; production source không `any`.
- Pure evaluator không network/filesystem/clock.
- Prose discovery không enforcement.
- Base policy luôn base SHA.
- Missing/incomplete authority không green.
- Observation completeness dependency-aware.
- Wrong/stale/foreign evidence không pass.
- Duplicate eligible evidence không được first-match thành green.
- App/workflow identity immutable.
- Human gate không thỏa từ bot/author/stale/unqualified review.
- PR code không bao giờ execute trong metadata/decision lane.
- Raw untrusted API data phải validate trước normalization.
- No token/secrets/private text trong logs/fixtures/receipt/report.
- No external write.
- Không claim signature, attestation, compliance hoặc correctness.
- Không claim G4 Action/shadow/enforcement.
- Không claim pilot/user value từ mock tests.

## 31. Failure handling

Nếu gặp failure:

1. reproduce tối thiểu;
2. phân loại code defect, contract ambiguity, API limitation, permission gap,
   fixture defect hoặc external authority blocker;
3. thêm failing test trước khi sửa khi thực tế;
4. sửa ở boundary đúng;
5. chạy targeted test;
6. chạy full relevant suite;
7. cập nhật closure manifest;
8. yêu cầu targeted subagent re-review nếu liên quan P0/P1.

Không downgrade test chỉ để xanh. Không đổi expected status từ non-ready sang
ready nếu chưa có authority proof. Không swallow GitHub error thành empty list.

## 32. Definition of done cho phần local/mock

Local/mock portion chỉ được gọi hoàn thành khi:

- mọi PG-301–314 có implementation và executable acceptance evidence;
- upstream/API/platform limitation chỉ được chấp nhận khi official source,
  explicit narrowed contract, stable executable fail-closed behavior và tests
  tồn tại; package/G3 local vẫn `incomplete`/`partial` trừ khi acceptance đã
  được chính thức narrow trong source-of-truth và thực thi đầy đủ;
- missing code/test không bao giờ được gọi “scoped limitation”;
- PG-315 có safe implementation hoặc evidence-backed defer;
- full normalized snapshot đi qua existing validator/evaluator;
- fixture manifest enumerate toàn bộ Prompt-4 fixture roots;
- happy-path và adversarial matrix pass;
- request/page/retry/bytes/rate-limit evidence được assert;
- TOCTOU discard pass;
- redaction validator pass;
- no orphan fixture;
- no P0/P1 từ ba subagents;
- build/typecheck/lint/tests/audit pass;
- docs claim đúng evidence level;
- no external state changed.

## 33. Definition of done cho G3 overall

Ngoài local/mock DoD, cần:

- maintainer-authorized read-only live smoke;
- exact target identity and base policy retrieval observed live;
- pagination/capability/rate headers captured redacted;
- no external write;
- final TOCTOU re-read live;
- live output validates;
- live limitations documented;
- closure manifest không còn `blocked_external_authority`;
- every G3 roadmap exit criterion có link đến executable/live evidence.

Nếu thiếu live authority, không chờ vô hạn và không dừng sớm: hoàn thành tất cả
local/mock/docs work trước, sau đó hỏi đúng một câu ngắn với exact information
needed để chạy live smoke.

## 34. Final response contract

Final response phải ngắn hơn report nhưng đủ kiểm chứng:

1. outcome đầu tiên;
2. G3 overall status;
3. major surfaces implemented;
4. exact validation commands/results và current counts;
5. security/provenance conclusions;
6. files/report links;
7. residual blockers;
8. exact next authorized action.

Handoff matrix:

- local/mock green, live pending → return exact smoke authorization brief:
  owner/repo, PR or supported group target, public/private status, credential
  provider/kind, minimum read scopes and confirmation of no external write;
- G3 complete nhưng G0 hoặc G2 chưa complete → hand off về executable remaining
  G0/G2 exit criteria, không bắt đầu Action;
- chỉ khi G0 + G2 + G3 đều complete mới hand off Prompt 5/G4 shadow Action;
- G4 handoff luôn shadow/non-required trước; không tự cấu hình ruleset.

Không yêu cầu user đọc commentary trước đó. Không nói “done” nếu live gate hoặc
P0/P1 còn mở. Nếu subagents đều PASS, nói phạm vi họ audit; không dùng PASS đó
để thay live evidence.

---

## Lệnh khởi đầu cho agent thực thi

Hãy bắt đầu ngay bằng cách đọc toàn bộ instruction/source-of-truth, audit
baseline hiện tại, tạo plan dài hạn theo slices, spawn ba subagents read-only,
nghiên cứu official GitHub API contract và sau đó triển khai. Không trả final
sau plan. Tiếp tục tự chủ qua mọi local/mock phase, kiểm thử và review loop cho
đến khi local/mock DoD đạt hoặc có blocker không thể giải quyết nếu thiếu
maintainer/external state.
