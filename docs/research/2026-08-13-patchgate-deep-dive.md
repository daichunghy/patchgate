# Nghiên cứu chuyên sâu PatchGate

**Ngày nghiên cứu:** 2026-08-13  
**Phạm vi:** GitHub Pull Request, GitHub Rulesets, CODEOWNERS, Actions,
merge queue, provenance, human handoff, reviewability và đóng góp do coding
agent hỗ trợ.  
**Trạng thái:** Tài liệu thiết kế và bằng chứng nghiên cứu; chưa phải bằng
chứng rằng GitHub adapter, GitHub Action hoặc pilot bên ngoài đã hoạt động.

## Kết luận điều hành

PatchGate có một khoảng trống sản phẩm hợp lý, nhưng khoảng trống đó không
phải là “một công cụ review code tốt hơn”. GitHub đã có native controls cho
branch protection, required checks, code-owner review và một phần merge
control. Các công cụ như Policy Bot, Danger và Reviewpad đã xử lý nhiều dạng
quy tắc tùy biến.

Giá trị có thể bảo vệ được của PatchGate là một **evidence admission gate**:
trước khi một Pull Request được biểu diễn là đủ điều kiện để maintainer dành
thời gian review, hệ thống phải trả lời được bốn câu hỏi:

1. Quy tắc được lấy từ nguồn nào, tại base SHA nào và digest là gì?
2. Evidence đang nói về contributor head, PR merge ref hay merge-group SHA?
3. Người, workflow hoặc App nào đã tạo evidence; nguồn đó có đủ đáng tin cho
   rule đang xét không?
4. Có human gate nào còn mở, và PatchGate đang báo “cần người duyệt” chứ
   không tuyên bố “đã được người duyệt”?

Kết luận quan trọng nhất là: **độ khó thật nằm ở adapter và trust boundary,
không nằm ở hàm đánh giá thuần**. Evaluator hiện tại đã có hướng đúng cho
local fixture. Tuy nhiên, trước khi gọi đây là v0.1, cần chứng minh rằng
adapter không biến dữ liệu thiếu, stale, sai nguồn hoặc chưa đủ quyền thành
ready_for_review.

Mức độ tin cậy của các kết luận:

| Nhóm kết luận | Mức tin cậy | Cơ sở |
| --- | --- | --- |
| GitHub API, SHA, Rulesets, Actions security | Cao | Tài liệu GitHub chính thức |
| Provenance và supply-chain boundary | Cao | NIST, SLSA, GitHub |
| Reviewability theo kích thước PR | Trung bình | Nghiên cứu thực nghiệm, chưa đủ để đặt ngưỡng chung |
| Khác biệt cạnh tranh | Trung bình | Tài liệu sản phẩm, cần pilot người dùng |
| Nhu cầu maintainer đối với PatchGate | Thấp đến trung bình | Chưa có pilot bên ngoài |

## 1. Đơn vị quyết định và mô hình authority

Một evaluation không nên được hiểu đơn giản là “PR hiện tại”. Đơn vị quyết
định đầy đủ là tuple sau:

~~~text
(repository,
 pullRequest,
 baseSha,
 headSha,
 targetKind,
 testedSha,
 basePolicyDigest,
 normalizedEvidenceSnapshot)
~~~

Nếu một trường trong tuple chưa xác định, hệ thống không có đủ dữ liệu để
trả về trạng thái xanh.

| Dữ liệu | Ý nghĩa | Nguồn được phép | Nếu thiếu |
| --- | --- | --- | --- |
| baseSha | Commit đích mà PR đang đề xuất thay đổi | PR metadata/API | policy_ambiguous |
| headSha | Commit mới nhất của contributor branch | PR metadata/API | evidence_missing |
| basePolicyDigest | Digest của patchgate.yml tại base | Contents API với ref=baseSha | policy_ambiguous |
| targetKind | head, merge hoặc merge_group | Event + merge-flow config | evidence_missing |
| testedSha | SHA mà check/review thực sự kiểm thử hoặc phê duyệt | Check/review/workflow metadata | evidence_missing |
| policySources | Nguồn enforcement và authority | Base contents, Rulesets, CODEOWNERS | policy_ambiguous nếu không phân biệt được |
| linkedIssues | Issue thực sự liên kết với PR | GitHub linked-issue metadata | failed hoặc unknown tùy quyền truy cập |
| reviews | Trạng thái review, commit, identity, qualification | Reviews + permission/team API | human_review_required hoặc evidence_missing |
| checks | Kết quả, SHA, source identity, workflow run | Checks/Actions API | evidence_missing |

AGENTS.md, CONTRIBUTING.md, README, PR template và các policy prose có thể
giúp discovery, nhưng không được tự động trở thành enforcement. Đây là điểm
phân biệt giữa “tìm thấy một câu hướng dẫn” và “có một requirement được
maintainer ủy quyền”.

## 2. Bản đồ API GitHub cần triển khai

Bảng dưới đây là contract thực tế cho GitHub adapter. Endpoint thành công
không đồng nghĩa dữ liệu đã đầy đủ; adapter phải kiểm tra phân trang, quyền,
trạng thái và commit binding trước khi tạo snapshot.

| Mục đích | API hoặc dữ liệu | Điều cần chuẩn hóa | Rủi ro và quyết định của PatchGate |
| --- | --- | --- | --- |
| Policy tại base | GET /repos/{owner}/{repo}/contents/{path}?ref={baseSha} | bytes, path, commit ref, SHA/digest, parse result | Không đọc policy từ PR head. Sai ref hoặc parse lỗi là policy_ambiguous. |
| CODEOWNERS tại base | Contents API tại một trong các vị trí GitHub hỗ trợ | raw text, location, revision, parse diagnostics, matched owners | Không dùng file CODEOWNERS mà PR vừa thêm để tự cấp owner. File lớn hơn giới hạn GitHub hoặc có dòng lỗi phải tạo diagnostic. |
| Effective Rulesets | GET /repos/{owner}/{repo}/rulesets?includes_parents=true; lấy detail theo ruleset id | target, source, enforcement, conditions, rules, bypass actors | Ruleset inherited có thể ảnh hưởng quyết định. Nếu token không nhìn thấy bypass actors, không suy đoán rằng không có bypass. |
| Branch protection | Repository/branch protection API khi cấu hình dùng native branch protection | required status checks, code-owner review, stale dismissal, restrictions | PatchGate giải thích native control; không dựng một branch-protection engine thứ hai. |
| PR metadata | Pull Request API | base/head SHA, merge commit, state, author, labels, draft, mergeable state | Title/body/labels là untrusted input; không đưa trực tiếp vào shell hoặc expression nguy hiểm. |
| Changed paths | GET /repos/{owner}/{repo}/pulls/{pull_number}/files với pagination | path, status, additions/deletions, patch availability, complete flag | GitHub giới hạn tối đa 3.000 file cho endpoint này. Nếu vượt hoặc pagination không hoàn tất, không được tính budget như thể đã đủ. |
| Linked issues | GraphQL closingIssuesReferences hoặc dữ liệu link tương đương | repository, issue number, link type, accessible/complete | Regex trong PR body chỉ là advisory clue. Không coi #123 là issue đã tồn tại và đã liên kết. |
| Reviews | GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews | login, state, commit_id, submitted_at, dismissal/current state | Cần gom trạng thái cuối cùng, loại bỏ dismissed/inactive, so commit_id với testedSha; APPROVED đơn lẻ chưa đủ. |
| Check runs | GET /repos/{owner}/{repo}/commits/{ref}/check-runs hoặc endpoint theo commit | name, status, conclusion, head_sha, App id/slug, workflow run | Tên check và SHA không chứng minh source. Expected source phải được kiểm tra theo policy/native setting. |
| Workflow runs | Actions workflow-runs API | run id, workflow id, event, head SHA, conclusion, attempt, actor | Dùng để giải thích và bind workflow evidence; không tự biến một run thành PatchGate App identity. |
| Collaborator permission | Repository collaborators/permission API | user, effective permission, role source khi có thể | Không suy ra qualified reviewer từ username hoặc author_association một mình. |
| Team membership | Team members/teams API trong phạm vi token cho phép | team slug/id, member, visibility, repository access | Team có thể private, bị thiếu quyền hoặc thay đổi sau lúc review. Nếu không chứng minh được qualification, phải fail closed. |
| Native rule suite | Rulesets rule-suites API, nếu cần đối chiếu | before/after SHA, result, rule evaluations | Có thể dùng để chứng minh native rule result; không thay thế receipt của PatchGate. |

Các tài liệu chính thức liên quan gồm [Contents API](https://docs.github.com/en/rest/repos/contents),
[Rulesets API](https://docs.github.com/en/rest/repos/rules), [PR files API](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files),
[Reviews API](https://docs.github.com/en/rest/pulls/reviews), [Check Runs API](https://docs.github.com/en/rest/checks/runs),
[CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
và [Rulesets rule suites](https://docs.github.com/en/rest/repos/rule-suites).

### 2.1 Giới hạn API phải là một phần của semantics

Adapter không được xử lý mọi lỗi API như nhau.

| Tình huống | Ý nghĩa | Trạng thái đề xuất |
| --- | --- | --- |
| 404 vì file policy không tồn tại tại base | Không có policy enforcement đáng tin | policy_ambiguous |
| 403 vì token không đủ đọc Rulesets | Không biết native controls đầy đủ | policy_ambiguous hoặc evidence_missing theo rule bị ảnh hưởng |
| Pagination chưa đi hết | Snapshot chưa hoàn chỉnh | evidence_missing |
| GitHub trả tối đa 3.000 changed files | Không biết toàn bộ reviewability/path ownership | evidence_missing, không phải budget passed |
| Rate limit hoặc transient 5xx | Chưa có quan sát ổn định | Retry có giới hạn; sau đó evidence_missing |
| Check completed nhưng head_sha khác target | Evidence stale/foreign | evidence_missing |
| APPROVED nhưng review bị dismiss hoặc commit cũ | Human gate chưa thỏa mãn | human_review_required |
| Không nhìn thấy bypass actors | Authority model chưa đầy đủ | policy_ambiguous nếu quyết định phụ thuộc vào nó |

Điểm cốt lõi: unknown không phải là failed, nhưng cả hai đều không thể được
dùng để sinh ready_for_review.

## 3. Evidence target và merge queue

GitHub có nhiều SHA hợp lệ trong cùng một PR. PatchGate cần ghi lại rõ ràng
không chỉ headSha mà cả targetKind và testedSha.

| Luồng | Target thường gặp | Sai lầm cần tránh |
| --- | --- | --- |
| PR event | merge ref hoặc commit được workflow lựa chọn | Gán GITHUB_SHA vào headSha mà không kiểm tra event |
| Direct head validation | contributor headSha | Dùng kết quả này như bằng chứng cho merge group mà chưa re-run |
| Merge queue | merge_group SHA | Cho phép check của PR head thỏa mãn required check của merge group |
| Re-run sau push | SHA mới, workflow run mới | Dùng lại receipt hoặc approval của SHA cũ |

Một rule required_check phải có semantics tương đương:

~~~text
pass iff
  check.name == configuredName
  AND check.status == completed
  AND check.conclusion in acceptableConclusions
  AND check.testedSha == evaluation.revisions.testedSha
  AND source identity satisfies configured expectedSource
~~~

Nếu expected source yêu cầu một GitHub App cụ thể, Action-only mode không được
tự nhận rằng mình đã đạt mức đó. GitHub hỗ trợ expected source cho required
checks, còn Check Runs API phân biệt App identity. Vì vậy, PatchGate cần hai
mức rõ ràng:

- **Action evidence:** workflow/run, SHA và conclusion được xác nhận; source
  là GitHub Actions hoặc nguồn đã chuẩn hóa, không phải PatchGate App riêng.
- **App-backed evidence:** check do PatchGate GitHub App tạo hoặc nguồn App
  được policy cho phép; có identity để đối chiếu expected source.

Không được gọi Action evidence là cryptographically trusted chỉ vì nó chạy
trên GitHub.

## 4. Hợp đồng normalized snapshot: điểm yếu cần xử lý

Pure evaluator hiện nhận các trường như qualified, sourceStrength và
policyChanged. Đây là thiết kế phù hợp để tách adapter khỏi core, nhưng ba
trường này không được xem là sự thật tự thân:

| Trường | Vấn đề nếu adapter làm sơ sài | Yêu cầu trước Action release |
| --- | --- | --- |
| ReviewSnapshot.qualified | Boolean có thể bị dựng từ login hoặc tên team | Ghi rõ endpoint/quyền/logic qualification; nếu không đủ dữ liệu thì unknown, không đặt true. |
| CheckEvidence.sourceStrength | Check name có thể trùng; workflow run không phải App identity | Bắt buộc lưu app id/slug, workflow id/run id, event và target SHA; phân biệt Action với App. |
| EvaluationInput.policyChanged | Adapter có thể quên đánh dấu thay đổi patchgate.yml | Tính từ complete changed-path snapshot và policy path config; thiếu complete path list thì không được kết luận không đổi. |

Đề xuất mở rộng snapshot ở Phase 2:

~~~ts
interface ObservationMeta {
  source: string;              // endpoint hoặc native source
  revision?: string;           // base/head/merge-group khi có
  responseDigest?: string;     // digest payload đã chuẩn hóa, không chứa secret
  retrievedAt: string;
  complete: boolean;
  permissionState: "sufficient" | "insufficient" | "unknown";
}
~~~

Mỗi nhóm observation nên có metadata tương tự. Receipt không cần lưu toàn bộ
payload API, nhưng phải đủ cho maintainer biết một kết luận đến từ endpoint
nào, ở revision nào và snapshot có hoàn chỉnh không.

## 5. Rule contract chi tiết

### 5.1 Policy integrity

**Pass:** patchgate.yml được đọc tại baseSha, parse thành policy hợp lệ,
digest khớp policySources, và nguồn có authority enforced.

**Fail/unknown:** file chỉ có ở PR head, digest mismatch, parse không đầy đủ,
hoặc source authority không thể xác nhận.

**Policy change:** nếu PR sửa policy path, rule được áp dụng vẫn là policy ở
base. Chế độ advisory, human_review và blocked phải được quyết định bởi base
policy, không bởi nội dung policy mới trong PR.

### 5.2 Issue linkage

**Pass:** có ít nhất một issue được GitHub xác nhận là linked, đúng repository
hoặc đúng cross-repository scope trong policy.

**Advisory:** số issue trong body, keyword hoặc URL chưa được API xác nhận.

**Unknown:** endpoint không trả đủ dữ liệu hoặc token không có quyền đọc.

**Không nên làm:** regex body rồi gọi đó là issue linkage đã xác minh.

### 5.3 Required checks

**Pass:** check hoàn tất, conclusion cho phép, đúng testedSha, tên đúng,
source đúng expected source, workflow run và event tương ứng merge flow.

**Fail:** completed nhưng conclusion không cho phép.

**Unknown/evidence missing:** không có check, check đang chạy, SHA sai, source
không đủ tin cậy, duplicate không thể phân giải, hoặc target không đúng.

**Duplicate:** Không chọn check đầu tiên tìm thấy. Adapter phải lưu tất cả
candidate cùng tên, sau đó policy source và App identity quyết định candidate
nào hợp lệ. Nếu có nhiều candidate cùng thỏa nhưng khác workflow/run, receipt
phải hiển thị ambiguity hoặc stable selection rule.

### 5.4 Ownership và CODEOWNERS

**Pass:** path ownership được tính từ CODEOWNERS tại base, owner hợp lệ, review
đang active, review commit đúng target, reviewer đủ permission/team
qualification và không phải author/bot nếu policy cấm.

**Unknown:** CODEOWNERS parse lỗi, file quá lớn, team không thể kiểm tra quyền,
hoặc changed paths chưa complete.

**Cần tôn trọng GitHub semantics:** CODEOWNERS path case-sensitive; cú pháp
không hoàn toàn giống .gitignore; invalid line có thể bị bỏ qua; team phải
visible và có quyền phù hợp. Do đó, một parser tối giản chỉ hỗ trợ * và **
chưa đủ để thay thế native CODEOWNERS. Nó chỉ phù hợp cho fixture hoặc phải
công bố rõ là subset.

### 5.5 Human handoff

human_review_required nghĩa là một gate do policy tuyên bố chưa được thỏa
mãn. Nó không có nghĩa người đã đọc code, và cũng không có nghĩa PatchGate có
thể ép coding agent dừng thao tác.

Gate nên tách riêng:

- sensitive path owner;
- policy-change owner;
- security-sensitive workflow owner;
- native code-owner review;
- release/merge approval nếu maintainer cấu hình.

### 5.6 Reviewability budget

File count, ownership domain, generated file và subsystem boundary là các tín
hiệu explainable. Chúng không phải bằng chứng code sai.

Nghiên cứu thực nghiệm về code review cho thấy hiệu quả có xu hướng giảm khi
changeset lớn hơn, nhưng kết quả phụ thuộc dataset, reviewer, composition và
định nghĩa effectiveness. Một nghiên cứu về các yếu tố ảnh hưởng tới code
review báo cáo sự suy giảm nhanh hơn tuyến tính khi changeset tăng ([IET
Software](https://ietresearch.onlinelibrary.wiley.com/doi/full/10.1049/iet-sen.2020.0134)).
Điều đó đủ để biện minh cho advisory signal, chưa đủ để chọn một ngưỡng
universal như “trên 50 file là không review được”.

Quyết định hiện tại nên là:

1. advisory mặc định;
2. blocking chỉ khi maintainer cấu hình;
3. không tính pass khi changed-path snapshot bị cắt bởi giới hạn API;
4. pilot phải đo false block trước khi đổi default threshold.

## 6. State machine và xử lý TOCTOU

Evaluation cần được xem là một state machine, không phải một lần gọi API tùy
ý. Một PR có thể thay đổi trong lúc PatchGate đang đọc reviews hoặc checks.

~~~mermaid
flowchart TD
  A[Event received] --> B[Capture repository, PR, base SHA, head SHA]
  B --> C[Read trusted base policy and native controls]
  C --> D{Policy and authority complete?}
  D -- No --> Z[Emit policy_ambiguous]
  D -- Yes --> E[Resolve targetKind and testedSha]
  E --> F[Fetch paginated metadata, reviews, checks, paths]
  F --> G{Snapshot complete and permission sufficient?}
  G -- No --> Y[Emit evidence_missing or policy_ambiguous]
  G -- Yes --> H[Normalize observations]
  H --> I[Run deterministic evaluator]
  I --> J[Re-read head/target identity]
  J --> K{Identity unchanged?}
  K -- No --> L[Discard result and re-evaluate]
  L --> B
  K -- Yes --> M[Publish receipt and derived check]
~~~

### 6.1 Event matrix

| Event | Bắt buộc recompute | Lý do |
| --- | --- | --- |
| opened, reopened | Toàn bộ | Tạo evaluation đầu tiên |
| synchronize | Toàn bộ checks, reviews, paths, policy-change | Head SHA mới làm evidence cũ stale |
| pull_request_review | Reviews, human gates, final receipt | Approval có thể được dismiss hoặc thay đổi |
| check_run / workflow completion | Check evidence và final receipt | Kết quả phải bind đúng target SHA |
| merge_group | Toàn bộ theo merge-group SHA | PR head pass chưa chứng minh merge group pass |
| label/body/title update | Chỉ khi policy dùng các trường này | Vẫn phải treat input là data và chống injection |

### 6.2 Quy tắc đọc hai lần

Adapter nên:

1. đọc PR identity ở đầu evaluation;
2. đọc policy và các evidence theo tuple đã chụp;
3. đọc lại head SHA và target identity trước khi publish;
4. hủy receipt xanh nếu identity đã đổi;
5. giới hạn retry để tránh loop; sau retry failure trả evidence_missing.

Đây không phải là cryptographic transaction. Nó chỉ giảm TOCTOU giữa metadata
được đọc và kết quả được công bố; receipt phải ghi rõ giới hạn này.

## 7. Security threat tests bắt buộc

| ID | Kịch bản | Kết quả bắt buộc |
| --- | --- | --- |
| TG-01 | PR sửa patchgate.yml để hạ rule của chính nó | Base policy vẫn được dùng; không green do head policy |
| TG-02 | Base policy digest thay đổi giữa hai lần đọc | policy_ambiguous; không publish green |
| TG-03 | Check pass trên SHA cũ | evidence_missing |
| TG-04 | Check cùng tên nhưng khác App/workflow | Không pass khi expected source không khớp |
| TG-05 | Nhiều check cùng tên, một cái pass một cái fail | Áp dụng source/selection rule; không dùng first match |
| TG-06 | pull_request_target checkout fork head rồi chạy npm install | Static security test fail build/action review |
| TG-07 | workflow_run tải artifact do fork tạo rồi chạy script trong đó | Artifact bị xem là untrusted; không chạy trong decision lane |
| TG-08 | PR title/body/branch chứa shell metacharacter | Không command injection, receipt vẫn hợp lệ |
| TG-09 | Approval trước headSha mới | human_review_required hoặc evidence missing |
| TG-10 | Approval của author/bot/dismissed reviewer | Không thỏa human gate |
| TG-11 | CODEOWNERS invalid, quá giới hạn, hoặc team không đủ quyền | Unknown; không tự cấp ownership |
| TG-12 | PR có hơn 3.000 changed files hoặc pagination thiếu trang | Không tính reviewability budget là pass |
| TG-13 | merge_group SHA khác PR head SHA | Chỉ evidence của merge group mới được tính |
| TG-14 | Token không nhìn thấy bypass actors | Không kết luận native policy đầy đủ |
| TG-15 | Receipt cũ được replay sau push mới | Input/target digest mismatch; bị từ chối hoặc không dùng làm gate |
| TG-16 | Người có quyền bypass native Ruleset xuất hiện trong snapshot | Hiển thị limitation; không tuyên bố native control tuyệt đối |

Các test này nên tồn tại ở ba lớp:

- pure fixture test cho evaluator;
- mocked API integration test cho adapter;
- workflow/static test cho YAML, permissions và privileged/untrusted lanes.

## 8. Security architecture cho GitHub Action

GitHub nêu rõ pull_request_target chạy với token của base repository và có
thể truy cập secrets; workflow_run cũng có thể có secrets và quyền ghi dù
workflow trước đó không có. Vì vậy, workflow tách privilege chỉ an toàn khi
workflow sau không checkout hoặc execute code/artifact không tin cậy. Xem
[securely using pull_request_target](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target),
[secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
và [GitHub Security Lab: preventing pwn requests](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/).

Kiến trúc release nên giữ ba lane:

| Lane | Được phép | Không được phép |
| --- | --- | --- |
| Trusted metadata | Đọc base policy, Rulesets, CODEOWNERS, PR metadata, checks | Checkout/install/build/test PR code |
| Untrusted verification | Chạy code contributor với read-only token, no secrets, runner ephemeral | Xuất token/secrets; tự cấp authority cho artifact |
| Trusted decision | Normalize authenticated metadata, evaluate, tạo receipt | Tin PR comment, artifact hoặc check name mà không bind source/SHA |

Action cần khai báo permissions tối thiểu. GitHub quy định khi khai báo một
permission thì các permission không nêu sẽ trở thành none; đây là cơ sở để
thiết kế allowlist thay vì mặc định quyền rộng. Reusable workflow và action
phải được pin theo SHA khi mức assurance yêu cầu.

Không đưa PR title, body, branch name hoặc label trực tiếp vào run. GitHub
cảnh báo đây là untrusted input có thể dẫn tới script injection; parse thành
dữ liệu có cấu trúc và truyền qua API/client parameterized.

## 9. Provenance, attestation và ranh giới tuyên bố

NIST SSDF v1.1 là khung thực hành cấp cao để tích hợp secure software
development vào SDLC, không phải một chứng nhận tự động. [NIST SP
800-218](https://csrc.nist.gov/pubs/sp/800/218/final) mô tả mục tiêu giảm
vulnerability, giảm impact và ngăn tái diễn bằng vocabulary chung.

SLSA mô tả provenance: artifact nào, build definition nào, builder nào, input
nào và run nào đã tạo ra artifact. [SLSA security levels](https://slsa.dev/spec/v1.0/levels)
phân biệt provenance tồn tại, provenance được ký bởi hosted build platform và
hardened build. [SLSA provenance model](https://slsa.dev/spec/v1.0/provenance)
cho thấy external parameters phải được xem xét và downstream verifier phải
đặt expectation cụ thể.

GitHub mô tả Artifact Attestations là provenance có chữ ký, liên kết artifact
với workflow, repository, environment, commit SHA và event. Tuy nhiên GitHub
cũng cảnh báo attestation không tự bảo đảm artifact an toàn; consumer vẫn
phải định nghĩa policy và verify claim. Xem [Artifact Attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations).

Hệ quả cho PatchGate:

- có thể dùng attestation/provenance như một evidence source ở phase sau;
- phải lưu subject digest, builder/workflow, source commit và verification result;
- không coi attestation là bằng chứng code đúng, PR compliant hoặc human đã review;
- không dùng receipt signed nếu PatchGate chưa triển khai signing key, storage,
  identity, rotation và verification path.

OpenSSF Scorecard phù hợp để đo security posture của repository và workflow,
không thay thế contribution receipt. PatchGate có thể consume Scorecard hoặc
CodeQL result như evidence bổ trợ, nhưng không nên mở rộng rule engine thành
security scanner ở v0.1.

## 10. So sánh cạnh tranh và ranh giới sản phẩm

| Nhóm | Điểm mạnh | Khoảng trống PatchGate có thể giữ |
| --- | --- | --- |
| GitHub native Rulesets/CODEOWNERS | Enforcement gần merge boundary, native permissions | Cross-source receipt, base-policy explanation, explicit evidence states |
| Policy Bot | Policy-as-code cho target branch, approval rules | Evidence target/source contract và human-handoff semantics của PatchGate |
| Danger | Quy tắc team linh hoạt, warning/fail trong CI | Không phải authority-aware admission decision; dễ trở thành script convention |
| Reviewpad | Policy, assignment, labels, protection workflow | Không nên cạnh tranh bằng DSL lớn; tập trung vào SHA/source/receipt |
| OpenSSF Scorecard | Repository security-health posture | Không đánh giá contribution readiness của từng PR |
| PatchGate | Trusted base policy + evidence binding + portable receipt | Chưa có live App/Action/pilot; differentiation còn là giả thuyết |

Reviewpad hiện có thông báo chuyển đổi dịch vụ trong tài liệu của họ; đây là
thông tin vận hành có thể thay đổi và không nên dùng làm luận cứ chiến lược
dài hạn. Product comparison phải được refresh trước mỗi quyết định cạnh tranh.

## 11. Pilot protocol và cách đo hiệu quả

Trước khi đặt threshold blocking, cần pilot ít nhất hai public repositories có
hình dạng khác nhau, ví dụ một repository nhỏ với CODEOWNERS đơn giản và một
repository nhiều team/merge queue. Chỉ giữ policy hoặc PR metadata khi có
permission phù hợp và tối thiểu hóa dữ liệu cá nhân.

### 11.1 Metrics

| Metric | Cách tính | Mục đích |
| --- | --- | --- |
| False-block rate | Số lần PatchGate block/human-gate nhưng maintainer xác nhận không cần gate / tổng evaluation có enforcement | Đo tác hại của default |
| Unknown rate | Evaluation có evidence_missing hoặc policy_ambiguous / tổng evaluation | Đo chất lượng adapter/quyền API |
| Stale rejection rate | Evidence stale bị phát hiện / tổng evidence stale được tạo trong test hoặc replay | Đo SHA binding |
| Source rejection rate | Foreign/duplicate source bị loại / tổng case source test | Đo expected-source boundary |
| Remediation time | Thời gian từ report đến trạng thái pass hoặc human acknowledgment | Đo actionable output |
| Review lead time | Thời gian từ PR ready đến review đầu tiên trước/sau pilot | Đo tác động thực tế, không gán nhân quả sớm |
| Receipt replay rate | Tỷ lệ receipt có thể tái tạo cùng input digest từ fixture | Đo deterministic core |
| Maintainer usefulness | Đánh giá ngắn sau mỗi case: useful / noisy / unclear | Kiểm tra UX và claim |

Không đặt KPI giảm review time trước khi có baseline. Một gate tốt có thể làm
tăng số lần sửa metadata trong tuần đầu nhưng giảm review bị lãng phí; cả hai
phải được đo cùng lúc.

### 11.2 Tiêu chí go/no-go

**Go:** adapter read-only chạy được ở hai repository, không có privileged
checkout, tất cả TG-01 đến TG-16 có negative test thích hợp, receipt có thể
replay và maintainer hiểu remediation.

**No-go:** có green khi testedSha sai; không phân biệt App/workflow source; không
biết changed paths có bị cắt; hoặc workflow decision lane có thể thực thi
code/artifact do fork kiểm soát.

## 12. Backlog ưu tiên sau nghiên cứu

### P0 — trước mọi live Action

1. Viết adapter snapshot contract có complete, permissionState, source và
   revision metadata.
2. Hoàn thiện target resolver cho head, merge, merge_group.
3. Implement pagination và hard cap diagnostics; không green by truncation.
4. Implement linked issues bằng GitHub metadata; body regex chỉ advisory.
5. Tạo review qualification module dựa trên authenticated permissions/team data.
6. Tạo check-source verifier; duplicate check phải có selection rule.
7. Thêm TOCTOU re-read trước publish.
8. Thêm workflow security lint/test cho pull_request_target, workflow_run,
   checkout, artifact download, permissions và shell interpolation.

### P1 — high-assurance GitHub integration

1. GitHub App với expected-source identity riêng nếu maintainer cần.
2. CODEOWNERS parser đầy đủ hoặc dùng native result thay vì parser subset.
3. Rule-suites/native result adapter.
4. Attestation/provenance evidence adapter cho artifact/release use case.
5. Receipt schema sâu hơn: observation provenance, API completeness và source
   identity.

### P2 — sau pilot

1. Calibrate reviewability budgets theo repository, không đặt threshold chung.
2. Công bố anonymized pilot findings và false-positive taxonomy.
3. Chỉ xem xét dashboard, hosted service hoặc nền tảng khác sau khi CLI/Action
   có retention và maintainer demand rõ ràng.

## 13. Source ledger

| Nguồn | Loại | Sử dụng trong memo | Giới hạn |
| --- | --- | --- | --- |
| [GitHub Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) | Official | Required checks, expected source, code-owner/stale review | Native behavior vẫn phụ thuộc repo config |
| [GitHub Rulesets API](https://docs.github.com/en/rest/repos/rules) | Official | Effective rulesets, inherited source, bypass actors | Quyền xem bypass actors có thể bị giới hạn |
| [GitHub Contents API](https://docs.github.com/en/rest/repos/contents) | Official | Base-revision policy/CODEOWNERS | Adapter phải bind explicit ref |
| [GitHub PR files](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files) | Official | Changed paths và 3.000-file cap | Không đủ cho unbounded diff |
| [GitHub Reviews API](https://docs.github.com/en/rest/pulls/reviews) | Official | Review state, commit id | Qualification vẫn cần permission/team normalization |
| [GitHub Check Runs](https://docs.github.com/en/rest/checks/runs) | Official | SHA, status, conclusion, App/run metadata | Action-only không mặc nhiên là PatchGate App |
| [GitHub secure pull_request_target](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target) | Official | Privileged/untrusted boundary | Guidance, không thay thế static/runtime test |
| [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use) | Official | workflow_run, script injection, secrets | Workflow author vẫn chịu trách nhiệm cấu hình |
| [GitHub Artifact Attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations) | Official | Provenance boundary, not correctness/compliance | Attestation phải được verify và policy hóa |
| [NIST SSDF SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final) | Standard | Secure development vocabulary | Không phải PatchGate certification |
| [SLSA levels](https://slsa.dev/spec/v1.0/levels) | Specification | Provenance/security-level distinction | Trang v1.0 hiện ghi retired; kiểm tra version hiện hành trước khi claim |
| [SLSA provenance](https://slsa.dev/spec/v1.0/provenance) | Specification | Build definition, builder, input, subject | Provenance không thay cho content review |
| [RepoComplianceBench](https://arxiv.org/abs/2607.26819) | Early preprint | Agent rule retrieval/verification gap | Dataset và kết luận còn mới |
| [Trust but Verify?](https://arxiv.org/abs/2607.12428) | Early preprint | Agent-assisted PR security-smell motivation | Không dùng prevalence estimate làm KPI |
| [IET code-review study](https://ietresearch.onlinelibrary.wiley.com/doi/full/10.1049/iet-sen.2020.0134) | Empirical study | Reviewability rationale | Không đủ để đặt universal threshold |
| [OpenSSF Scorecard](https://scorecard.dev/) | Open-source security tool | Complementary posture evidence | Không phải contribution readiness gate |

## Kết luận cuối

PatchGate nên tiếp tục, nhưng release criterion phải được chuyển từ “evaluator
chạy đúng fixture” sang “adapter không bao giờ nâng dữ liệu chưa đủ authority
thành green”. Ba bằng chứng cần ưu tiên hơn mọi feature mới là:

1. một test chứng minh policy của PR không thể tự nới rule cho chính PR đó;
2. một integration test chứng minh check/review stale hoặc foreign source không
   được chấp nhận;
3. một workflow security test chứng minh decision lane không checkout, tải và
   thực thi code/artifact do fork kiểm soát.

Chỉ sau khi ba boundary này và pilot maintainer được chứng minh mới nên mở
rộng sang GitHub App, attestation, dashboard hoặc các nguồn policy phức tạp
hơn.

