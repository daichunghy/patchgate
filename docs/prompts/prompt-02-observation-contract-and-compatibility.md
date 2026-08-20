# Prompt 2 — Observation contract, policy binding và compatibility fixtures

> Historical execution prompt. Roadmap 2.0 supersedes its G1-to-G0 dependency
> wording: G1 is now `locally_verified`, while G0 publication authority is
> tracked independently. Prompt 2 implementation semantics and tests remain
> applicable.

Bạn là lead implementation agent tiếp tục phát triển PatchGate tại:

```text
/Users/macos/Desktop/Github
```

Mục tiêu của lượt này là hoàn thành corrective slice còn lại sau Prompt 1 và
triển khai trọn vẹn:

```text
PG-108 — Observation completeness, permission và provenance metadata
PG-109 — Phân biệt confirmed failure với missing/unknown evidence
PG-110 — Schema compatibility và deterministic replay fixtures
```

Không chỉ lập kế hoạch. Hãy review source thực tế, điều phối subagents, trực tiếp
triển khai, viết test, cập nhật tài liệu và chạy toàn bộ verification phù hợp.

### Kết quả bắt buộc của lượt này

Lượt này chỉ được gọi là `complete` khi đồng thời đạt ba kết quả:

1. không snapshot malformed, internally inconsistent hoặc thiếu
   decision-bearing evidence nào có thể tạo `ready_for_review` trong phạm vi
   local contract;
2. mọi quyết định có thể replay từ versioned fixture cùng provenance, requirement
   result, final status, reason IDs và digest oracle;
3. mọi claim trong docs phân biệt rõ local evaluator evidence với authenticated
   GitHub evidence chưa tồn tại.

Local replay không thể phát hiện caller đã dựng một snapshot giả nhưng hoàn toàn
self-consistent. Source authenticity chỉ có thể được chứng minh bởi authenticated
adapter ở G3. Prompt 2 phải ngăn internal contradiction/omission và ghi rõ giới
hạn này, không được biến checksum thành authentication claim.

`complete` trong báo cáo cuối chỉ có nghĩa Prompt 2/technical G1 slice đã hoàn
thành. Roadmap 2.0 sau đó tách state này thành `locally_verified`; G0 vẫn chặn
public Action, pilot và release cho đến khi có quyết định repository/license.

## 1. Tài liệu bắt buộc đọc trước khi làm

Agent chính và mọi subagent phải đọc toàn bộ, không chỉ skim:

1. `PROJECT_CONSTITUTION.md`
2. `AGENTS.md`
3. `docs/implementation-roadmap.md`
4. `docs/agent-execution-plan.md`
5. `docs/agent-work-packages.yml`
6. `docs/architecture.md`
7. `docs/receipt-contract.md`
8. `docs/threat-model.md`
9. `docs/reviews/2026-08-13-prompt-01-review.md`
10. `docs/research/2026-08-13-patchgate-deep-dive.md`, đặc biệt các phần về
    normalized snapshot, API completeness, state machine, SHA/source binding và
    TG-01 đến TG-16.

`PROJECT_CONSTITUTION.md` là authority cao nhất. Nếu prompt, roadmap, docs và
source mâu thuẫn, giữ constitution/trust model, nêu rõ mâu thuẫn và sửa artifact
thấp hơn. Không âm thầm thay đổi authority semantics để làm test xanh.

## 2. Bắt buộc sử dụng subagents

Phải dùng ít nhất ba subagents. Không để nhiều subagents sửa cùng file trong lúc
song song vì workspace dùng chung.

### Giai đoạn A — subagents review độc lập, read-only

Spawn ba subagents song song:

#### Subagent A — Observation contract reviewer

Phạm vi:

- `src/types.ts`
- `src/contract/**`
- ba JSON Schemas
- `fixtures/pr-ready.json`
- PG-108 và PG-110 trong YAML backlog.

Nhiệm vụ:

- đề xuất contract nhỏ nhất nhưng đủ để biểu diễn completeness, permission,
  source, revision, retrieval time và response/normalized digest;
- xác định field nào thuộc decision semantics và field nào chỉ thuộc audit
  envelope;
- xác định versioning/migration rule cho evaluation input và receipt;
- liệt kê cross-field invariants mà JSON Schema không tự kiểm được.

Không sửa file. Trả về proposal, risks, file/line evidence và test matrix.

#### Subagent B — Evidence/security reviewer

Phạm vi:

- `src/evaluator.ts`
- `src/evidence/**`
- `src/policy.ts`
- threat model và deep-dive research.

Nhiệm vụ:

- tìm mọi trường hợp bare empty array hoặc boolean có thể tạo false green;
- review policy-object/base-source binding;
- review required-check workflow/check-run identity, App identity, target SHA và duplicate
  selection;
- review ownership, review actor identity, linked issues và policyChanged;
- viết repro cho mỗi P0/P1 nhưng không để lại file tạm.

Không sửa file. Trả findings ưu tiên và acceptance tests.

#### Subagent C — Compatibility/test reviewer

Phạm vi:

- `test/**`
- `fixtures/**`
- package scripts
- architecture/receipt/roadmap docs.

Nhiệm vụ:

- map current tests sang PG-108/109/110 và TG cases;
- tìm claim tài liệu chưa có executable evidence;
- đề xuất compatibility fixtures, replay rules, permutation tests và CLI exit
  behavior;
- kiểm tra evaluator core có còn phụ thuộc filesystem/schema loader hay không.

Không sửa file. Trả gap matrix và commands cần có.

### Giai đoạn B — agent chính tổng hợp trước khi sửa

Agent chính phải:

1. tự inspect source và chạy repro, không chấp nhận findings theo niềm tin;
2. hợp nhất findings trùng lặp;
3. chốt contract và migration note ngắn;
4. ghi rõ files dự kiến sửa;
5. chỉ sau đó mới bắt đầu implementation.

Trước edit đầu tiên, ghi một decision record ngắn vào báo cáo implementation,
ít nhất gồm:

- chọn `observations map` hay `ObservedCollection<T>` và lý do;
- trust boundary cho raw policy bytes, normalized policy và authenticated source;
- taxonomy `invalid input` so với `valid snapshot nhưng evidence unknown`;
- exact check-candidate selection rule;
- ba namespace version: input schema, receipt schema và evaluator/package;
- file ownership theo từng slice; agent chính là editor duy nhất trong giai đoạn
  implementation, subagents chỉ review read-only.

### Giai đoạn C — subagents post-review

Sau khi agent chính hoàn tất implementation, dùng lại ít nhất hai subagents để
review read-only lần cuối:

- một agent chạy security/false-green probes;
- một agent kiểm schema compatibility, docs claims và verification matrix.

Agent chính tự sửa findings cuối, chạy full verification và chịu trách nhiệm
cho kết luận hoàn thành.

Nếu post-review tìm P0/P1, ghi finding vào register với `ID`, severity, repro,
owner, fix evidence và test ID. Sau khi sửa phải yêu cầu targeted re-review cho
finding đó; không được tự đóng finding chỉ vì test tổng quát vẫn xanh.

## 3. Baseline bắt buộc chạy trước khi sửa

```bash
npm run verify
npm run build
npm run test:schema
npm run test:determinism
npm run test:fixtures
npm audit
```

Ghi lại:

- số test files và test cases;
- exit code;
- lỗi hiện hữu nếu có;
- workspace có hay không có `.git`.

Hiện workspace chưa phải Git repository. Không được giả vờ có diff/history và
không được khởi tạo Git, tạo remote hoặc publish trong prompt này.

Tạo hoặc cập nhật báo cáo:

```text
docs/reviews/2026-08-13-prompt-02-implementation.md
```

Báo cáo phải giữ baseline command/exit code, contract decision record, findings
register, slice checkpoints, closure manifest và residual gaps. Không dùng file
tạm làm bằng chứng cuối.

## 4. Corrective slice bắt buộc trước PG-108

### 4.1 Bind normalized policy với trusted base source

Hiện `policyDigest` mô tả raw policy bytes, nhưng normalized `input.policy` chưa
có internal contract digest gắn với source record. Một snapshot có thể thay
policy object và giữ raw digest claim cũ.

Hãy thiết kế và triển khai một invariant rõ ràng, ví dụ:

```ts
interface PolicySource {
  kind: PolicySourceKind;
  identity: string;
  revision: string;
  digest: string;          // raw source bytes/API snapshot digest
  contractDigest?: string; // digest của normalized enforceable contract
  authority: "enforced";
}
```

Tên field có thể khác nếu có lý do tốt, nhưng phải đạt các điều kiện:

- base policy loader nhận raw bytes một lần, parse/normalize nội bộ rồi tính raw
  digest và normalized contract digest từ cùng artifact;
- evaluator tự tính digest của normalized policy và so với source contract
  digest;
- policy source phải đúng `baseSha`;
- duplicate/conflicting source không được chọn bằng first match;
- receipt ghi đủ raw digest và contract digest;
- thay normalized policy nhưng giữ source digests cũ phải tạo
  `policy_ambiguous`, không được xanh;
- không tuyên bố đây là chữ ký hoặc authenticity proof; authenticated adapter
  vẫn chịu trách nhiệm chứng minh source đến từ GitHub/base SHA.

`contractDigest` chỉ chứng minh internal consistency, không chứng minh
authenticity. Caller có thể thay cả policy và digest nếu production path nhận
hai claim do caller tự tạo. Vì vậy phải chốt data path:

```text
raw policy bytes + expected source/base identity
  -> trusted policy artifact constructor
  -> parse + normalize + rawDigest + contractDigest
  -> validated/branded snapshot
  -> pure evaluator
```

Không có production constructor nào được nhận sẵn `policy + contractDigest` rồi
coi checksum đó là bằng chứng nguồn tin cậy. Nếu giữ `evaluate --event` cho local
replay, docs và receipt provenance phải nói đây là caller-supplied local
snapshot, không phải authenticated GitHub retrieval. G3 sau này mới chứng minh
raw bytes thực sự đến từ GitHub tại `baseSha`.

Phân biệt hai lớp lỗi:

- digest sai format, thiếu field bắt buộc hoặc target revision tự mâu thuẫn:
  invalid contract, CLI exit `2`, không phát receipt;
- digest đúng format nhưng raw/normalized/source claims xung đột: snapshot có thể
  đánh giá nhưng authority không xác định, phát `policy_ambiguous`, CLI exit `1`.

Thêm regression fixture cho policy self-relaxation thực sự:

1. trusted base policy yêu cầu issue và check;
2. normalized policy bị thay thành policy lỏng hơn;
3. source/digest vẫn là base claim cũ;
4. kết quả bắt buộc `policy_ambiguous`, không phải xanh.

Thêm test thứ hai: attacker thay normalized policy và tự tính lại
`contractDigest` nhưng giữ raw digest/base claim. Trusted artifact ingestion path
không được trả `ready_for_review`. Không sửa raw base policy fixture để biến test
thành một input “hợp lệ”.

Oracle của test này phải đi qua constructor nhận một raw base-policy fixture
riêng và expected base identity. Constructor tự parse và tính cả hai digest;
caller không được inject normalized policy vào cùng path. Nếu test chỉ đưa một
normalized object vào `evaluate --event`, test đó không chứng minh authenticity
và không được dùng để claim đã chống fabricated self-consistent snapshot.

### 4.2 Tách pure evaluator khỏi filesystem schema loading

Core evaluator hiện import validator, validator đọc schemas từ filesystem khi
module được load. Điều này làm pure core phụ thuộc packaging/filesystem.

Refactor theo một trong các hướng sau, ưu tiên đơn giản:

```text
untrusted JSON/YAML/API
  -> runtime validation + semantic validation boundary
  -> branded/validated EvaluationInput
  -> pure deterministic evaluator
  -> receipt core
  -> delivery-envelope validation
```

Yêu cầu:

- malformed external input không vào pure evaluator;
- pure evaluator không đọc file, network, environment hoặc wall clock;
- CLI vẫn validate trước evaluation;
- future GitHub adapter có một validation boundary dùng lại được;
- generated receipt vẫn có schema/semantic validation tại delivery boundary;
- test chứng minh core module có thể evaluate validated fixture mà không cần
  lookup schemas ở runtime path không xác định.

Tách ownership rõ, ví dụ:

```text
parse/validate external value -> ValidatedEvaluationInput
evaluateValidated(input)      -> ContributionReceiptCore
deliver(core, clock)           -> DeliveredContributionReceipt
validateDelivered(receipt)     -> boundary result
```

Tên API có thể khác, nhưng pure function không được tự cast/brand input và
delivery function là nơi duy nhất inject `evaluatedAt`.

Không tạo public API/module split phức tạp hơn nhu cầu `v0.1`.

## 5. PG-108 — Observation metadata contract

### 5.1 Contract tối thiểu

Mỗi nhóm observation đến từ GitHub hoặc local adapter phải có metadata tương
đương:

```ts
type PermissionState = "sufficient" | "insufficient" | "unknown";

interface ObservationMeta {
  source: { kind: string; identity: string };
  revision?: string;
  retrievedAt: string;
  complete: boolean;
  permissionState: PermissionState;
  normalizedDigest?: string;
  responseDigest?: string; // audit-only nếu raw response không được giữ để recompute
  truncated?: boolean;
  nextCursor?: string;
}
```

Có thể dùng một `observations` map bên cạnh arrays hiện có để giảm migration:

```ts
interface EvaluationObservations {
  policySources: ObservationMeta;
  changedPaths: ObservationMeta;
  linkedIssues: ObservationMeta;
  reviews: ObservationMeta;
  checks: ObservationMeta;
  ownership: ObservationMeta;
  reviewability: ObservationMeta;
}
```

Hoặc dùng wrapper `ObservedCollection<T>`. Subagents phải so sánh hai hướng và
agent chính chọn một, nhưng contract cuối phải:

- không duplicate payload gây drift không cần thiết;
- ghi rõ source/revision cho dữ liệu quyết định;
- cho phép phân biệt `items=[] và complete=true` với `không lấy được items`;
- không dùng `complete=true` khi pagination bị cắt hoặc token thiếu quyền;
- không cho audit-only timestamps làm đổi decision/receipt digest;
- cho `complete`, `permissionState`, source/revision và `normalizedDigest`
  ảnh hưởng decision digest vì chúng thay đổi mức độ tin cậy;
- validate timestamp bằng ngày lịch thật;
- reject unknown fields và unsupported enum values.

`normalizedDigest` phải được evaluator/boundary tự recompute từ canonical
normalized items của đúng group. Không nhận một digest tùy ý rồi hash tiếp claim
đó. Nếu giữ `responseDigest` của raw API response nhưng không giữ raw response để
recompute, coi nó là audit metadata và không dùng làm decision authority.

Cross-field invariants bắt buộc:

- `complete=true` yêu cầu `permissionState=sufficient`, không `truncated`, không
  `nextCursor` và có `normalizedDigest` hợp lệ;
- `complete=false` không được diễn giải là zero-result;
- thay item nhưng giữ `normalizedDigest` cũ phải bị phát hiện;
- metadata của group này không thể hoán đổi sang group khác;
- source/revision phải đúng loại group; policy/CODEOWNERS source dùng base SHA,
  evidence revision dùng target phù hợp;
- `complete+sufficient` của một collection không được ghi nếu một page/source
  thành phần chưa đủ.

### 5.2 Observation groups bắt buộc

Phải có semantics tối thiểu cho:

1. trusted policy sources;
2. changed paths;
3. linked issues;
4. reviews;
5. check/workflow evidence;
6. ownership/CODEOWNERS-derived requirements;
7. reviewability snapshot.

Policy source metadata không được gộp mù thành một cờ `complete` duy nhất nếu
PatchGate policy, CODEOWNERS, Rulesets và branch protection đến từ nguồn/quyền
khác nhau. Dùng metadata theo source record hoặc source family để một endpoint
thiếu không bị che bởi endpoint khác đã đủ.

### 5.3 Fail-closed matrix

Implement table-driven semantics:

| Observation | Complete + sufficient | Incomplete/insufficient/unknown |
| --- | --- | --- |
| Policy sources | Có thể đánh giá authority/digest | `policy_ambiguous` |
| Changed paths | Có thể tính policy change, ownership, sensitive paths, reviewability | `evidence_missing`; không được nói “không match” |
| Linked issues | Zero verified link là confirmed failure khi rule required | `evidence_missing`, không phải `blocked` |
| Checks | Missing/pending đúng target là `evidence_missing`; completed failure là `blocked` | `evidence_missing` |
| Reviews | Zero qualified approval là `human_review_required` | `evidence_missing` vì chưa biết gate state |
| Ownership | Complete/no owner match có semantics rõ | `evidence_missing`; không được trả xanh do array rỗng |
| Reviewability advisory | Signal/advisory bình thường | advisory diagnostic, không block |
| Reviewability blocking | Pass/fail theo threshold | `evidence_missing` |

`policy=null` cùng complete+sufficient policy discovery nhưng không có enforceable
source vẫn là `policy_ambiguous`, không phải “không có policy nên pass”. Nếu
ownership policy phụ thuộc CODEOWNERS mà source family không có `CODEOWNERS@base`,
authority/ownership requirement phải non-ready dù ownership array trông rỗng.

Không collapse `unknown` thành `failed`, nhưng cả hai đều không được dùng để tạo
`ready_for_review` khi rule enforceable phụ thuộc observation đó.

Một item “pass” không thắng collection metadata: `checks.complete=false` dù có
một successful run, hoặc `reviews.complete=false` dù có một qualified approval,
đều phải là `evidence_missing` nếu rule phụ thuộc group đó.

### 5.4 Dependency-aware evaluation

Không biến mọi observation thiếu thành blocker toàn cục. Mỗi rule phải khai báo
hoặc có table rõ nó phụ thuộc group nào:

| Rule/decision | Observation bắt buộc |
| --- | --- |
| Authority và base-policy integrity | policy source record tương ứng |
| Policy-change, sensitive paths, ownership match | complete changed paths |
| Required issue linkage | linked issues |
| Mỗi configured required check | checks/workflow evidence |
| Ownership approval | changed paths, CODEOWNERS/ownership và reviews/qualification |
| Sensitive human handoff | changed paths và reviews/qualification |
| Reviewability blocking | reviewability; thêm changed paths nếu snapshot derive từ paths |
| Reviewability advisory | thiếu group chỉ tạo advisory diagnostic |

Một group incomplete chỉ tạo non-ready requirement khi policy/decision thực sự
phụ thuộc nó. Ví dụ policy không có required check thì `checks.complete=false`
không tự tạo `evidence_missing`. Ngược lại, changed paths incomplete không được
cho sensitive path, ownership hoặc policy-change rule suy ra “no match”. Vì
PatchGate luôn phải phát hiện canonical `patchgate.yml` thay đổi, full PR
evaluation muốn xanh phải có complete changed-path observation.

Thêm paired tests: cùng một snapshot incomplete, policy không dùng group thì
không block; bật rule phụ thuộc group thì phải `evidence_missing`.

## 6. Required-check workflow và check-run identity

Prompt 1 mới bắt buộc `workflowRunId`, nhưng run ID không phải stable configured
workflow identity. Evidence do GitHub App tạo hiện cũng chưa có immutable
`checkRunId`, nên receipt có thể pass mà không chỉ ra check run thực tế đã được
dùng. Mở rộng contract ở mức cần thiết, ví dụ:

```ts
interface CheckEvidence {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: string;
  testedSha: string;
  sourceStrength: SourceStrength;
  appSlug?: string;
  appId?: number;
  checkRunId?: number;
  workflowId?: number;
  workflowPath?: string;
  workflowRunId?: number;
  workflowRunAttempt?: number;
  event?: string;
  retrievedAt: string;
}
```

Policy expected source cho GitHub Actions phải có stable identity phù hợp, ưu
tiên base-controlled `workflowPath` hoặc authenticated workflow ID. Không dùng
run ID làm expected configuration. Evidence `github_app_expected` phải có
immutable `checkRunId`; evidence `github_actions_workflow` phải có run identity
và stable workflow identity. Receipt requirement phải tham chiếu evidence thực
sự dùng bằng `check-run:<checkRunId>` hoặc
`workflow-run:<workflowRunId>:attempt:<workflowRunAttempt>:check:<encodedName>`.

Identity tối thiểu:

- GitHub App check: positive immutable `appId` và `checkRunId`; `appSlug` chỉ là
  display/secondary consistency field, không đủ để pass một mình;
- GitHub Actions: expected `appId`, stable `workflowId` hoặc canonical
  base-controlled `workflowPath`, cùng `workflowRunId`, positive
  `workflowRunAttempt` và event tương thích target;
- exact duplicate `checkRunId` hoặc duplicate cùng
  `(workflowRunId, workflowRunAttempt, check name, testedSha)` là invalid
  normalized snapshot, không phải hai votes độc lập; nhiều check name khác
  nhau trong cùng một workflow run là hợp lệ vì một workflow có thể tạo nhiều
  job/check.

Source resolution order bắt buộc:

```text
name
  -> configured target SHA
  -> expected App/workflow identity
  -> check-run hoặc workflow run/event provenance
  -> collection completeness
  -> eligible-candidate uniqueness/explicit selection
  -> status
  -> conclusion
```

Không xét conclusion trước khi giải quyết duplicate. Trong v0.1, nếu có nhiều
distinct candidates cùng thỏa name + target + expected identity + provenance mà
không có authenticated explicit selection record, trả
`unknown/evidence_missing` với reason ambiguity. Không tự chọn newest bằng array
order, timestamp hoặc first match. Nếu adapter sau này chọn rerun cụ thể, selection
record và algorithm phải nằm trong normalized contract và fixture.

Các trường hợp:

- same name + wrong SHA: không pass;
- same name + same GitHub Actions App nhưng wrong workflow path/ID: không pass;
- đúng GitHub App nhưng thiếu `checkRunId`: không pass;
- same name + right source + pending: `evidence_missing`;
- right source/SHA + completed failure: `blocked`;
- nhiều eligible candidates không có stable selection: ambiguity/evidence missing;
- một success + một failure, hoặc một success + một pending, cùng eligible set:
  ambiguity/evidence missing, không được chọn success;
- stale/foreign candidate không được đầu độc candidate hợp lệ sau khi đã lọc;
- wrong event hoặc thiếu workflow ID/run attempt: không pass;
- Action-only không được nhận là PatchGate App.

## 7. Review và ownership identity

`login` chỉ là display identifier. Bổ sung authenticated immutable actor identity
ở normalized contract, ví dụ `actorId`, cùng immutable review identity
`reviewId`. Team principal cần `teamId`; team slug chỉ dùng hiển thị.

Yêu cầu:

- một actor chỉ được tính một approval dù có nhiều event hoặc khác casing login;
- review state phải là normalized current state;
- author, bot, dismissed, inactive, stale commit hoặc unqualified actor không
  thỏa gate;
- team qualification phải có provenance/permission state;
- bare `qualified=true` không đủ nếu qualification/team-membership observation
  thiếu source, permission hoặc completeness;
- evidence reference dùng immutable actor/review identity, không chỉ login;
- `ownership.requireCodeOwnerApproval=true` cùng ownership observation incomplete
  không được xanh;
- complete changed paths + complete CODEOWNERS data + no matched rule phải có
  explicit “no ownership requirement” observation, không suy ra từ missing data.

Không tự xây full GitHub CODEOWNERS parser trong prompt này nếu chưa có GitHub
adapter. Chỉ hoàn thiện normalized contract và evaluator semantics; ghi limitation.

Receipt validation phải bảo đảm referential integrity: approval được tính phải
tồn tại trong normalized review evidence, đúng `actorId`, target commit và
qualification source. Rehash receipt sau khi xóa actor evidence hoặc đổi
`humanGate.satisfied` không được làm receipt hợp lệ.

Test current-state semantics: cùng `actorId`, approval event cũ không được tính
nếu normalized current state là `CHANGES_REQUESTED` hoặc `DISMISSED`. Team slug
có mặt nhưng thiếu immutable `teamId`, hoặc membership/qualification observation
incomplete/insufficient, phải là `evidence_missing`; không được tin bare
`qualified=true`.

## 8. Derive hoặc verify policy-change state

Không tiếp tục tin một bare boolean `policyChanged` nếu changed paths đã có trong
snapshot.

Ưu tiên:

- loại bỏ `policyChanged` khỏi input và derive từ complete changed paths;
- luôn xem canonical `patchgate.yml` policy path là protected policy source;
- áp dụng thêm paths cấu hình trong `policyChanges.paths`;
- nếu changed paths incomplete, policy-change state là unknown;
- policy của PR head không được govern PR đó;
- changed paths và declared boolean/state mâu thuẫn phải bị reject nếu vẫn giữ
  compatibility field tạm thời.

Thêm test:

- `changedPaths` có `patchgate.yml` nhưng old boolean false;
- configured policy path match glob;
- no match với complete paths;
- incomplete paths;
- policy object self-relaxed nhưng base contract digest không đổi.

## 9. PG-109 — Missing, failed và unknown semantics

### 9.1 Linked issues

Phân biệt tối thiểu:

```text
complete + sufficient + verified linked issue exists -> passed
complete + sufficient + zero verified links         -> failed / blocked
incomplete or permission insufficient                -> unknown / evidence_missing
body-only issue number                               -> advisory clue only
```

Không coi regex `#123` là verified linkage.

### 9.2 Required checks

```text
completed success + right SHA/source -> passed
completed unacceptable conclusion    -> failed / blocked
missing or pending                    -> unknown / evidence_missing
foreign/stale/unverifiable            -> unknown / evidence_missing
duplicate eligible candidates         -> unknown / evidence_missing
```

### 9.3 Human approvals

```text
complete review observation + no qualified approval -> human_review_required
incomplete review/qualification observation          -> evidence_missing
qualified current approval                           -> passed
```

### 9.4 Reviewability

- advisory mode không biến missing snapshot thành merge-blocking state;
- blocking mode trả `evidence_missing` nếu observation không đầy đủ;
- thresholds vẫn repository-configured, không đặt universal defaults mới.

### 9.5 Mixed-result precedence và stable reasons

Giữ precedence đã công bố trong `src/contract/status-precedence.ts` và
`docs/receipt-contract.md`; không đổi chỉ để một fixture dễ pass:

```text
policy_ambiguous
  > evidence_missing
  > human_review_required
  > blocked
  > ready_for_review
```

Receipt vẫn phải giữ tất cả requirement results dù final status chỉ có một.
Thêm table-driven tests cho ít nhất:

- policy ambiguity + confirmed failed check;
- missing evidence + unsatisfied human gate;
- unsatisfied human gate + confirmed blocking failure;
- advisory diagnostic + otherwise-ready evaluation;
- cùng semantics nhưng input order khác: final status, ordered stable reason IDs
  và digests không đổi.

Reason ID phải stable theo rule identity, không sinh từ array index hoặc message
text. Mọi non-passing requirement phải xuất hiện đúng một lần trong `reasonIds`.

## 10. PG-110 — Versioning, compatibility và replay

### 10.1 Version evaluation input

Thêm explicit version cho normalized evaluation snapshot, ví dụ:

```json
{ "schemaVersion": "0.1", "repository": { } }
```

Yêu cầu:

- unversioned input bị reject với diagnostic rõ;
- unsupported version bị reject trước evaluator;
- receipt và input versions không bị nhầm lẫn;
- evaluator version lấy từ một nguồn build/package nhất quán; bản
  `0.1.0-dev` không tự phát receipt nhận là release `0.1.0`;
- migration fixture ghi rõ old unversioned prototype không phải supported public
  contract;
- version bump chỉ khi semantics thực sự breaking.

Ba namespace độc lập:

1. evaluation-input schema version;
2. ContributionReceipt schema version;
3. evaluator/package version.

Không auto-upgrade unversioned prototype trong production parser. Chuyển fixture
cũ vào vùng `legacy-unversioned/invalid` hoặc migration-only fixture, ghi stable
diagnostic và migration note. Không thay schema version chỉ để đồng bộ số với
package version.

### 10.2 Receipt core và delivery envelope

Làm rõ bằng types/docs/tests:

- pure receipt core không phụ thuộc wall-clock;
- final delivered `ContributionReceipt` có `evaluatedAt` bắt buộc;
- `evaluatedAt` và retrieval timestamps không đổi semantic digests;
- authority, completeness, permission, source/revision và contract digests có
  ảnh hưởng semantic digest;
- `changedPaths` tiếp tục có trong receipt;
- final status/reason IDs/human gates phải internally consistent;
- receipt digest là deterministic checksum, không phải chữ ký.

Receipt schema phải lưu observation provenance được dùng để quyết định, gồm tối
thiểu source identity, revision, completeness, permission, retrieval timestamp
và normalized digest. Không nhất thiết lưu raw API response hoặc PR body.

Receipt semantic validator phải kiểm referential integrity, không chỉ hash:

- mỗi `evidenceRef` trỏ đến evidence thực tồn tại trong receipt;
- selected check evidence đúng exact SHA, source, workflow/check-run identity;
- requirement `passed` không thể giữ nguyên sau khi evidence tương ứng bị xóa;
- `humanGate.satisfied=true` phải khớp requirement và distinct approved actor
  evidence;
- rehash một receipt mâu thuẫn không làm nó hợp lệ.

Core và delivery nên có type/schema ownership rõ. Pure core không có clock;
delivered receipt bắt buộc `evaluatedAt`. Nếu dùng một schema với definitions
khác nhau, tests vẫn phải chứng minh core không được nhầm là delivered artifact.

### 10.3 Compatibility fixtures bắt buộc

Tạo fixture directories có tên rõ, ví dụ:

```text
fixtures/contract/0.1/valid/
fixtures/contract/0.1/invalid/
fixtures/evaluator/authority/
fixtures/evaluator/evidence/
fixtures/evaluator/ownership/
fixtures/evaluator/reviewability/
fixtures/security/
```

Ít nhất phải có:

1. valid ready fixture;
2. unsupported input version;
3. policy object/digest mismatch;
4. policy source conflict;
5. wrong head target;
6. merge target missing merge SHA;
7. merge-group target missing merge-group SHA;
8. incomplete changed paths;
9. incomplete linked issues;
10. complete linked issues with zero result;
11. check wrong workflow identity;
12. completed failed check;
13. duplicate eligible check;
14. stale/foreign check plus one valid check;
15. reviews unavailable;
16. same actor duplicate approval;
17. ownership observation missing;
18. advisory reviewability missing;
19. blocking reviewability missing;
20. completed check missing conclusion;
21. GitHub App check missing immutable check-run identity;
22. timestamp-only replay;
23. observation-order permutation;
24. schema downgrade;
25. contradictory rehashed receipt;
26. receipt mutation/input alias regression;
27. complete=false checks containing one success;
28. complete=false reviews containing one qualified approval;
29. same eligible source: success plus failure;
30. same eligible source: success plus pending;
31. same App slug but wrong immutable app ID;
32. workflow wrong event or missing run attempt;
33. complete+sufficient observation missing normalized digest;
34. item changed without normalized digest update;
35. incomplete unused observation versus same observation required by policy;
36. receipt evidence reference points to nonexistent item;
37. core receipt without clock versus delivered receipt missing evaluatedAt;
38. maximum accepted collection versus cap-plus-one rejection;
39. complete policy discovery with zero enforceable source;
40. ownership policy missing CODEOWNERS-at-base source family;
41. same actor has old approval but current state changes-requested/dismissed;
42. team slug present but immutable team ID/qualification provenance missing;
43. rehashed satisfied human gate with failed requirement or deleted actor;
44. selected check ref exists but has wrong SHA/App/workflow identity;
45. GitHub Actions evidence presented where policy expects a distinct GitHub App;
46. raw base-policy constructor rejects injected self-relaxed normalized object.

Không chỉ tạo file. Tạo một executable fixture manifest/oracle dạng discriminated
union, ví dụ:

```text
reject oracle:
  fixture ID, path, kind=reject, diagnostic ID, exit=2, suite/command

evaluate oracle:
  fixture ID, path, kind=evaluate, expected requirement results, final status,
  reason IDs, exit=0|1, digest equality/inequality relation, suite/command
```

Invalid fixture không phải khai final status/digest của receipt không tồn tại.
Fixture runner phải kiểm bijection cho mọi Prompt-2-owned root gồm
`contract/evaluator/security`: mọi fixture có manifest entry và mọi manifest path
tồn tại. Legacy/baseline fixture được loại trừ chỉ khi có explicit exclusion với
lý do. Orphan fixture hoặc fixture không có assertion phải fail test.

### 10.4 Determinism rules

Stable-sort only collections không có semantics thứ tự. Không sort mù mọi array.
Document từng collection:

- set-like: changed paths, policy sources, linked issues, checks, ownership
  domains/requirements, normalized reviews;
- configured/display order: giữ nếu output UX hoặc policy semantics cần;
- raw policy digest vẫn hash raw trusted bytes;
- normalized policy contract digest hash canonical contract.

Permutation tests phải chứng minh cùng semantic observation tạo cùng digest.
Semantic metadata như authority, completeness, permission, source/revision hoặc
normalized digest đổi thì decision digest phải đổi. Audit-only `retrievedAt`,
delivery `evaluatedAt`, URL tạm hoặc raw-response audit digest không được làm đổi
semantic digest.

## 11. Schema và semantic validation requirements

JSON Schemas phải tiếp tục:

- `additionalProperties: false` ở mọi structured object;
- positive integer cho IDs/counts phù hợp;
- non-whitespace strings, không chỉ `minLength: 1`;
- logical uniqueness được kiểm bằng semantic validator khi JSON Schema không đủ;
- conditional source fields theo source strength;
- conditional target fields theo target kind;
- observation metadata đầy đủ;
- receipt `observed` arrays chỉ chứa type được TypeScript cho phép.

Runtime/semantic boundary phải kiểm hard contract invariants:

- target revision invariants;
- digest fields có format/canonical projection hợp lệ và có thể recompute;
- unique source identities;
- unique actor/ownership identities;
- required counts là positive integer và được thỏa bởi distinct authenticated
  actors; không giới hạn count bằng số principal khi principal có thể là team;
- observation completeness/permission consistency;
- final status/reason IDs/human gates consistency;
- timestamp là ngày lịch thật;
- digest recomputation.

Một well-formed recomputed policy/source mismatch không bị boundary ném mất như
malformed input. Boundary phải giữ conflict dưới dạng authority finding để pure
evaluator phát `policy_ambiguous`. Chỉ missing/malformed digest field hoặc payload
không thể normalize mới exit `2`.

### 11.1 Invalid contract và evaluable non-ready state

Không dùng “fail closed” như một kết quả mơ hồ. Chốt taxonomy và CLI behavior:

| Trường hợp | Xử lý | CLI exit |
| --- | --- | ---: |
| Malformed JSON/YAML, unknown field, unsupported schema, invalid timestamp/digest format | reject, không receipt | 2 |
| Revision envelope tự mâu thuẫn, completed check thiếu conclusion, source-strength thiếu conditional immutable ID | reject, không receipt | 2 |
| Well-formed policy source/contract digests xung đột | receipt `policy_ambiguous` | 1 |
| Well-formed observation incomplete/permission insufficient nhưng rule phụ thuộc | receipt `evidence_missing` hoặc `policy_ambiguous` theo authority | 1 |
| Foreign/stale check candidate trong complete collection | required check `unknown`, `evidence_missing` | 1 |
| Confirmed rule failure | `blocked` hoặc `human_review_required` theo rule | 1 |
| Tất cả enforced requirements pass | `ready_for_review` | 0 |

Diagnostics cho exit `2` phải ổn định đủ để fixture assert; không cần đóng băng
toàn bộ prose, nhưng phải có stable diagnostic code/ID.

### 11.2 Bounds và algorithmic safety

Canonicalization và duplicate detection chạy trước nhiều logic khác, nên thêm
documented safety bounds cho số collection items, string size và nested entries.
Các bounds là parser/resource safety limits, không phải reviewability policy.

Yêu cầu:

- constants có tên và docs giải thích nguồn/chọn lựa;
- validate cap trước expensive hashing/sorting khi thực tế;
- dùng `Set`/`Map` hoặc index phù hợp, không giữ obvious O(n²) duplicate scans;
- max-size representative fixture pass; cap + 1 reject với diagnostic ổn định;
- pagination bị GitHub/API cap phải được biểu diễn `complete=false`, không cắt
  array rồi ghi complete;
- không dùng hard wall-clock assertion dễ flaky; kiểm cấu trúc thuật toán và
  workload đại diện, ghi benchmark chỉ như diagnostic nếu có.

Không dùng type assertion `as EvaluationInput` để đi vòng runtime validation
trong production path.

## 12. Files và kiến trúc mong đợi

Được phép điều chỉnh tên file nếu giữ scope rõ. Dự kiến chạm:

```text
src/types.ts
src/contract/validation.ts
src/contract/status-precedence.ts
src/contract/observation.ts              # nếu cần
src/evidence/digests.ts
src/evidence/source-verifier.ts
src/evidence/target-resolver.ts          # nếu cần
src/evaluator.ts
src/policy.ts
src/cli.ts
schemas/patchgate-policy.schema.json
schemas/evaluation-input.schema.json
schemas/contribution-receipt.schema.json
fixtures/**
test/**
docs/architecture.md
docs/receipt-contract.md
docs/threat-model.md
docs/implementation-roadmap.md
docs/agent-execution-plan.md
docs/agent-work-packages.yml
docs/reviews/**
package.json
```

Không hand-edit `dist`. Chỉ build lại từ source sau khi source/tests pass.

Trong Slice 1, cập nhật machine-readable work packages để không drift với code:

- PG-108 bao phủ types, observation boundary, schemas, fixtures và tests;
- PG-109 bao phủ missing/failed semantics cho issue, checks, review, ownership và
  reviewability, không chỉ linked issue;
- PG-110 phụ thuộc PG-108/109 và bao phủ manifest, replay, schema/version và docs;
- corrective work của PG-101–107 phải xuất hiện trong G1 closure manifest thay
  vì bị ghi nhầm thành PG-108–110.

## 13. Ràng buộc an toàn và scope

- Không thêm LLM vào evaluator.
- Không biến prose discovery thành enforcement.
- Không implement GitHub API adapter hoặc Action trong prompt này, ngoài contract
  types cần chuẩn bị cho G3/G4.
- Không checkout, install hoặc execute PR-controlled code trong trusted lane.
- Không khởi tạo Git repository, chọn license, tạo public remote, publish npm,
  tạo release hoặc nộp Codex for Open Source.
- Không tạo dashboard, database, hosted service, GitLab adapter, signing system
  hoặc compliance claim.
- Không gọi receipt là signed, tamper-proof hoặc attestation.
- Không gọi local tests là live GitHub proof.
- Các local TG regression chỉ là G1 coverage; không đánh dấu PG-501–PG-510 hoặc
  G5 complete khi chưa có adapter/workflow/security-lane evidence.
- Không sửa tests để hợp thức hóa fail-open behavior.
- Không bỏ fields provenance chỉ để fixture dễ viết.
- Không coi empty array là complete observation nếu meta không chứng minh.
- Không lưu raw API response, PR body, review comment, token hoặc unnecessary
  personal data trong public receipt; giữ minimum immutable IDs cần replay.

## 14. Cách triển khai

Thực hiện theo vertical slices, mỗi slice phải giữ typecheck/test xanh:

Mỗi slice là một checkpoint self-consistent: type, schema, fixture migration,
runtime code và test liên quan phải đi cùng nhau. Không được để Slice 1 phá toàn
bộ fixture rồi hứa Slice 4 mới sửa. Sau mỗi slice ghi command/exit code vào báo
cáo implementation.

### Slice 1 — version và contract types

- schemaVersion cho evaluation input;
- observation metadata types;
- policy contract digest;
- workflow, check-run and actor identity fields;
- schemas và invalid fixtures.

Checkpoint: schema tests + typecheck + legacy-unversioned migration oracle.

### Slice 2 — runtime/semantic boundary

- parse/validate external input;
- target/source/policy cross-field invariants;
- pure validated evaluator boundary;
- receipt delivery validation.

Checkpoint: schema/boundary tests + CLI invalid-input smoke tests.

### Slice 3 — evaluator semantics

- completeness and permission gates;
- linked issue unknown vs failed;
- reviews unavailable vs no approval;
- ownership empty vs unavailable;
- policyChanged derivation;
- advisory/blocking reviewability behavior.

Checkpoint: table-driven evaluator tests, dependency-pair tests và mixed-status
precedence tests.

### Slice 4 — digests và compatibility

- raw policy digest vs normalized contract digest;
- semantic observation projection;
- stable set ordering;
- receipt core/envelope replay;
- version compatibility fixtures.

Checkpoint: deterministic tests + executable fixture manifest bijection.

### Slice 5 — docs và full verification

- contract/architecture/threat docs;
- roadmap baseline and blockers;
- test-to-TG mapping;
- subagent post-review;
- final fixes and clean verification.

Checkpoint: full clean verification, sau đó post-review; nếu sửa finding sau
post-review phải chạy lại targeted suite và full verification.

## 15. Commands bắt buộc ở cuối

Tạo thêm scripts nếu thật sự có suite tương ứng; không thêm script rỗng.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:schema
npm run test:determinism
npm run test:fixtures
npm run test:security      # chỉ nếu đã tạo suite thật
npm audit
```

Thực hiện thêm CLI smoke tests:

```text
valid versioned fixture                -> expected final status / exit code
malformed JSON                         -> exit 2
unsupported schema version             -> exit 2
invalid calendar timestamp             -> exit 2
policy contract digest mismatch        -> policy_ambiguous / exit 1
revision envelope testedSha mismatch   -> reject / exit 2
stale check candidate SHA              -> evidence_missing / exit 1
incomplete linked issue observation    -> evidence_missing
complete zero linked issue observation -> blocked
failed required check                  -> blocked
completed check without conclusion     -> reject / exit 2
GitHub App check without appId/runId   -> reject / exit 2
complete=false checks + success item   -> evidence_missing / exit 1
success + failure both eligible        -> evidence_missing ambiguity / exit 1
reviews unavailable                    -> evidence_missing
complete no qualified review           -> human_review_required
```

Ngoài console output, tạo verification traceability matrix trong báo cáo hoặc
fixture manifest. Mỗi acceptance ID phải map tới fixture/test path, expected
requirement result, final status, reason IDs, CLI exit, digest relation và
command thực thi. Không ghi `PASS` nếu command không được chạy ở lượt hiện tại.

Nếu `npm run test:security` chưa tồn tại thì không gọi. Nếu tạo script này, nó
phải chạy suite security thật và có test IDs; script rỗng hoặc alias chỉ để làm
đẹp báo cáo là failure.

## 16. Definition of done

Chỉ báo hoàn thành Prompt 2 khi tất cả điều kiện sau đúng:

- PG-108 có observation contract được runtime validate;
- PG-109 phân biệt missing/failed/unknown đúng theo matrix;
- PG-110 có versioned compatibility và replay fixtures;
- normalized policy object được bind nội bộ với trusted-base contract digest;
- source/workflow/check-run identity không thể bị bỏ trống mà vẫn tạo green;
- collection incomplete không thể bị một item pass bên trong che khuất;
- observation thiếu chỉ ảnh hưởng rule thực sự phụ thuộc nó;
- `testedSha` luôn bind đúng declared target revision;
- incomplete changed paths không thể tạo “no match” pass;
- ownership-required + unavailable ownership data không thể green;
- linked issue API unavailable không bị báo confirmed missing link;
- review API unavailable không bị báo đơn thuần là chưa có người duyệt;
- duplicate actor không tăng approval count;
- `policyChanged` được derive hoặc verified từ complete paths;
- advisory reviewability missing không block; blocking mode missing trả
  `evidence_missing`;
- input/receipt versions được reject/accept có chủ đích;
- timestamp-only và order-only changes không đổi semantic digests;
- semantic authority/completeness/source changes làm đổi digest;
- receipt final state tự nhất quán ngay cả khi bị rehash;
- receipt evidence refs, human gates và selected evidence có referential
  integrity;
- fixture manifest không có orphan hoặc unasserted fixture;
- parser/canonicalization có documented bounds và cap tests;
- pure evaluator không cần filesystem/network/wall-clock;
- tất cả commands bắt buộc pass;
- docs không claim live GitHub integration;
- hai post-review subagents không còn P0/P1 chưa xử lý trong scope.

Nếu một điều kiện chưa đạt, báo `partial` và giữ đúng blocker; không gọi G1 hoặc
PG-108–PG-110 complete chỉ vì unit tests hiện có xanh.

### 16.1 G1 closure manifest

Prompt 2 chạm corrective semantics của PG-101–PG-107, nên báo cáo phải audit đủ
PG-101 đến PG-110. Với mỗi package ghi:

```text
package ID | outcome | files | acceptance/test IDs | commands | residual gap
```

Package chỉ được `complete` khi acceptance có executable evidence. Báo cáo có
thể ghi “G1 technical implementation evidence complete”. Trong backlog version
2, state tương ứng là `locally_verified`; publication authority được theo dõi
riêng ở G0.

## 17. Báo cáo cuối bắt buộc

Trả báo cáo ngắn nhưng đủ bằng chứng theo cấu trúc:

1. **Kết luận:** complete hay partial.
2. **Subagents đã dùng:** task, findings chính, cách agent chính kiểm chứng.
3. **Work packages:** PG-108/109/110 và corrective items nào đã hoàn thành.
4. **Contract changes:** version, observation, policy binding, identity, digest.
5. **Files changed:** nhóm theo source/schema/test/docs.
6. **Behavior matrix:** missing vs failed vs human gate vs ambiguity.
7. **Verification:** command, exit code, test file count, test count.
8. **Security repro:** các false-green cũ nay trả kết quả gì.
9. **Residual gaps:** chỉ các gap thật, không lặp non-goals.
10. **G1 closure manifest:** PG-101–PG-110, executable evidence và gaps.
11. **Findings register:** P0/P1, targeted re-review và trạng thái xác nhận.
12. **Handoff:** mặc định là decision brief cho maintainer về `PG-001` repository
    identity/publishing authority và `PG-003` OSI license. Không tự chọn license,
    init Git, publish, hoặc bắt đầu/claim G2/G3 cho đến khi mọi G0 exit criterion
    có executable evidence và G0 thực sự complete.

Không chỉ nói “đã sửa”. Mỗi kết luận quan trọng phải có file/test/command evidence.
