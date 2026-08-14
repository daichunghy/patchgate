# Prompt 3 — Public project foundation, maintainer decisions và G0 evidence

Sao chép toàn bộ prompt này vào agent chính. Agent phải làm việc trực tiếp trong
`/Users/macos/Desktop/Github`, dùng subagents theo cơ chế bên dưới, và tiếp tục
cùng task sau khi maintainer trả lời decision gate. Không rút gọn prompt thành
một danh sách hướng dẫn chung.

---

## 1. Vai trò và nhiệm vụ

Bạn là lead implementation agent của PatchGate. Nhiệm vụ của Prompt 3 là đưa
repository từ local evaluator prototype sang một public-project foundation có
thể kiểm chứng, đúng Gate G0 trong:

1. `PROJECT_CONSTITUTION.md`;
2. `AGENTS.md`;
3. `docs/agent-work-packages.yml`;
4. `docs/agent-execution-plan.md`;
5. `docs/implementation-roadmap.md`.
6. `docs/product/user-requirements.md`;
7. `docs/research/2026-08-13-patchgate-user-needs-roadmap-review.md`.

Đây là một nhiệm vụ hai chặng:

- **Chặng A — audit và maintainer decision:** chỉ đọc, nghiên cứu nguồn chính
  thức, lập decision brief và dừng để maintainer quyết định.
- **Chặng B — implementation và live verification:** chỉ bắt đầu sau khi có câu
  trả lời rõ ràng; tạo Git/public foundation trong đúng phạm vi được cho phép,
  kiểm thử, mở PR thật nếu được phép, chờ CI thật, rồi báo cáo evidence.

Không được tự chọn license, chủ sở hữu, repository slug, copyright holder,
public visibility, quyền push, quyền mở/merge PR hoặc ruleset thay maintainer.
Việc một GitHub CLI session đang authenticated không đồng nghĩa với quyền thực
hiện external write.

## 2. Trạng thái đầu vào đã được kiểm chứng ngày 2026-08-13

Hãy kiểm tra lại, không mặc định số liệu vẫn đúng:

- workspace: `/Users/macos/Desktop/Github`;
- chưa có thư mục `.git`;
- chưa có `LICENSE`;
- chưa có public remote;
- `package.json` vẫn `private: true` và version `0.1.0-dev`;
- Prompt 2 đã có versioned input, observation contract, evaluator/receipt
  validation và fixture manifest;
- baseline gần nhất:
  - 49 non-CLI tests pass;
  - 4 CLI process tests pass;
  - 50 executable fixture/oracle entries;
  - 11 security tests;
  - `npm audit --audit-level=high` báo 0 vulnerability;
- Prompt 2 closure audit đã đóng các receipt false-valid cases liên quan:
  - selected check conclusion không còn được đổi rồi rehash thành receipt hợp lệ;
  - human gate không còn được giảm dưới `requiredCount` rồi rehash;
  - workflow evidence ref đã bind `workflowRunId` và
    `workflowRunAttempt`;
  - reviewer evidence phải khớp configured login hoặc immutable team principal;
- GitHub CLI gần nhất đang authenticated vào `daichunghy-ben`, nhưng đây chỉ là
  trạng thái đọc được, không phải maintainer authorization.

Đọc báo cáo:

- `docs/reviews/2026-08-13-prompt-02-implementation.md`;
- `docs/receipt-contract.md`;
- `docs/threat-model.md`.

Nếu baseline đã đổi, ghi rõ chênh lệch trước khi tiếp tục.

## 3. Mục tiêu G0

Prompt 3 chỉ được gọi hoàn thành khi có executable/live evidence cho mọi exit
criterion G0:

1. public repository thật tồn tại đúng owner/slug được maintainer xác nhận;
2. Git history và default branch thật tồn tại;
3. license được maintainer chọn, là OSI-approved, và file license đúng template;
4. community health files tồn tại ở vị trí GitHub nhận diện;
5. baseline CI chạy xanh trên một pull request thật;
6. secret scan chạy thật và pass;
7. default-branch ruleset được cấu hình sau khi tên check đã ổn định;
8. README và package metadata chỉ đưa ra claim đã có evidence;
9. G1 giữ trạng thái `locally_verified` theo evidence Prompt 2; G0 publication
   authority được theo dõi độc lập. G2 có thể chuẩn bị sau G1, nhưng public
   Action, shadow pilot và release không được vượt G0.
10. feedback/security routes và consent-safe early-user protocol tồn tại.

Nếu maintainer chưa cho phép public remote, PR hoặc ruleset, Prompt 3 được phép
hoàn thành local preparation nhưng phải ghi `G0: blocked/pending maintainer
action`. Không được thay thế live evidence bằng file YAML hay local test.

## 4. Non-goals

Không làm trong Prompt 3:

- không implement G2 git-ref preflight;
- không implement G3 authenticated GitHub adapter;
- không tạo product GitHub Action `action.yml`;
- không chạy hay mô phỏng contributor code trong trusted lane;
- không publish npm package hoặc tạo release;
- không bỏ `private: true`;
- không nộp Codex for Open Source application;
- không tạo adoption, stars, users, pilot feedback hoặc usage claims giả;
- không thêm LLM core, dashboard, database, SaaS hay telemetry;
- không tạo `CODEOWNERS` chỉ để repository trông hoàn chỉnh;
- không coi `AGENTS.md`, README hoặc prose policy là enforcement authority.

## 5. Quy tắc dùng subagents

Phải dùng ba subagents độc lập ở Chặng A. Tất cả subagent chỉ review/read-only.
Agent chính là editor duy nhất.

### Subagent A — repository foundation auditor

Phạm vi:

- inventory toàn bộ file, build/test entry points và generated artifacts;
- kiểm tra `.gitignore`, package metadata, docs links, current claims;
- xác định file nào phải nằm trong initial commit;
- tìm secret, credential, large file, machine-specific path và personal data
  risk;
- đối chiếu PG-001 đến PG-009 với current filesystem;
- đưa ra findings P0/P1/P2 và evidence path/command.

Không sửa file, không init Git, không stage hay commit.

### Subagent B — OSS governance/license researcher

Phạm vi:

- chỉ dùng nguồn OSI, SPDX, license steward, GitHub Docs hoặc nguồn chính thức;
- lập neutral decision matrix cho tối thiểu MIT và Apache-2.0;
- ghi rõ patent grant, notice/attribution obligation và mức đơn giản vận hành;
- không đưa legal advice và không chọn thay maintainer;
- kiểm tra community health surfaces GitHub hiện nhận diện;
- đề xuất nội dung CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, SUPPORT,
  issue/PR templates và maintainer identity surface;
- không bịa email, tổ chức, security contact hoặc governance role.

Không sửa file.

### Subagent C — CI/security/release auditor

Phạm vi:

- đề xuất minimal-permission CI cho TypeScript package hiện tại;
- phân tách untrusted `pull_request` lane và trusted metadata/decision lane;
- cấm `pull_request_target` checkout/build/install/test contributor code;
- kiểm tra action pinning, permissions, secrets, cache và dependency risks;
- đề xuất secret scan thật, không dùng placeholder;
- lập live-verification checklist cho PR, check name và ruleset;
- xác định external actions nào cần resolve immutable commit SHA từ upstream.

Không sửa file hoặc tạo workflow.

### Main-agent synthesis

Agent chính phải:

1. tự đọc authority files đầy đủ;
2. chạy baseline commands;
3. kiểm chứng từng finding quan trọng của subagents;
4. hợp nhất duplicate findings;
5. tạo một decision brief có recommendation kỹ thuật nhưng không tự quyết;
6. dừng đúng hard gate;
7. sau maintainer response, là editor duy nhất;
8. sau implementation, gọi lại subagents read-only để review:
   - community/license consistency;
   - CI/security boundary;
   - G0 evidence/delivery truthfulness;
9. tự tái hiện P0/P1 trước khi sửa và tái kiểm sau khi sửa;
10. không gọi G0 complete nếu còn P0/P1 hoặc live criterion chưa có evidence.

## 6. Chặng A — audit chỉ đọc

### 6.1 Đọc authority và inventory

Đọc hoàn toàn:

```text
PROJECT_CONSTITUTION.md
AGENTS.md
README.md
package.json
package-lock.json
.gitignore
docs/agent-work-packages.yml
docs/agent-execution-plan.md
docs/implementation-roadmap.md
docs/product/user-requirements.md
docs/research/2026-08-13-patchgate-user-needs-roadmap-review.md
docs/architecture.md
docs/receipt-contract.md
docs/threat-model.md
docs/reviews/2026-08-13-prompt-02-implementation.md
```

Inventory bằng `rg --files`, loại `node_modules` và `dist`. Không suy luận từ
tên file.

### 6.2 Baseline verification

Chạy và lưu exit code:

```bash
npm run verify
npm run build
npm run test:schema
npm run test:determinism
npm run test:fixtures
npm run test:security
npm audit --audit-level=high
```

Kiểm tra:

```bash
test -d .git
git status --short --branch
gh auth status
gh api user --jq .login
find . -maxdepth 2 -type f \( -name 'LICENSE*' -o -name '.env*' \) -print
```

Không in token hoặc secret. Nếu `gh auth status` hiển thị token, chỉ ghi
authenticated account/scopes cần thiết và redacted output.

### 6.3 Current official research

Vì program terms, GitHub behavior, action SHAs và license catalogs có thể thay
đổi, kiểm tra live source trong ngày chạy:

- OpenAI Codex for Open Source:
  https://developers.openai.com/community/codex-for-oss
- OpenAI program terms từ link trên;
- OSI Approved Licenses:
  https://opensource.org/licenses
- GitHub community profile:
  https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories
- GitHub repository creation:
  https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository
- GitHub rulesets:
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- GitHub repository security quickstart:
  https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository

Đối với OpenAI/Codex, chỉ dùng official OpenAI sources. Đối với GitHub behavior,
ưu tiên GitHub Docs/API. Ghi accessed date. Không copy dài license/program terms
vào report; link và tóm tắt.

### 6.4 Repository namespace checks

Chỉ đọc:

- kiểm tra owner/slug candidate có tồn tại trên GitHub chưa;
- kiểm tra npm package name availability chỉ để cung cấp context;
- không reserve namespace;
- không tạo repo, package, organization hay DNS;
- không coi name availability là trademark clearance.

### 6.5 Decision brief artifact

Tạo hoặc cập nhật:

`docs/decisions/2026-08-13-g0-maintainer-decision-brief.md`

Brief bắt buộc có:

1. verified current state;
2. P0/P1/P2 audit findings;
3. owner/slug candidates và collision check;
4. neutral license matrix với official links;
5. proposed Git history/publication sequence;
6. proposed community files;
7. proposed CI/security design;
8. external actions dự kiến và immutable pin method;
9. exact maintainer questions;
10. impact của mỗi lựa chọn;
11. explicit statement rằng authenticated account không phải consent;
12. provisional G0 status;
13. commands đã chạy và exits;
14. residual uncertainties.

### 6.6 Hard decision gate

Sau khi brief hoàn thành, dừng implementation và hỏi maintainer đúng các mục:

```text
G0-MD-01 GitHub owner:
G0-MD-02 Repository slug:
G0-MD-03 Public visibility authorized now? yes/no:
G0-MD-04 Default branch:
G0-MD-05 License SPDX ID:
G0-MD-06 Copyright holder text:
G0-MD-07 Copyright year:
G0-MD-08 Initialize local Git and create commits? yes/no:
G0-MD-09 Create remote and push to the exact owner/slug? yes/no:
G0-MD-10 Open a real foundation PR and wait for CI? yes/no:
G0-MD-11 After CI pass, may the agent merge the PR? yes/no:
G0-MD-12 After merge, may the agent configure the proposed ruleset? yes/no:
G0-MD-13 Security contact: GitHub private vulnerability reporting only, or a maintainer-supplied address?
```

Không chọn default chỉ vì một option được ghi là recommended. Nếu câu trả lời
thiếu license/copyright/owner/permission cần thiết, tiếp tục phần an toàn có thể
làm nhưng không thực hiện action bị thiếu quyền.

## 7. License decision standard

Subagent và main agent phải trình bày trung lập. Tối thiểu:

| Choice | Cần giải thích | Không được suy diễn |
| --- | --- | --- |
| MIT | permissive, ngắn, giữ copyright/license notice | không gọi là patent protection tương đương Apache-2.0 |
| Apache-2.0 | permissive, explicit patent grant/termination, NOTICE conditions khi áp dụng | không nói phù hợp pháp lý tuyệt đối cho mọi contributor/company |

Chỉ dùng exact official template sau khi maintainer chọn. Không tự sửa điều
khoản license. Không ghép nhiều license hoặc thêm Commons Clause. Nếu chọn một
license khác, verify OSI approval và SPDX ID trước.

License text, copyright holder và year phải nhất quán giữa:

- `LICENSE`;
- `package.json`;
- README badge/text nếu có;
- contribution/release docs.

`private: true` vẫn giữ nguyên vì G0 không phải npm release.

## 8. Chặng B — implementation sau maintainer decision

### 8.1 Checkpoint B0 — authorization ledger

Trước external write, ghi trong report:

- exact maintainer answers;
- action nào được phép;
- action nào chưa được phép;
- exact GitHub target;
- license/copyright choice;
- whether merge/ruleset are authorized.

Không ghi access token. Nếu account hiện authenticated khác owner được chọn,
dừng và báo mismatch.

### 8.2 Checkpoint B1 — local Git safety và baseline

Trước `git init`:

1. scan untracked inventory;
2. loại `node_modules`, `dist`, coverage, logs, tmp receipts, OS metadata;
3. tìm high-risk patterns trong tracked candidates:
   - tokens/private keys;
   - `.env` files;
   - machine-specific credentials;
   - personal data không cần thiết;
4. chạy dependency audit;
5. lưu artifact list dự kiến commit;
6. không stage file ngoài workspace;
7. không dùng destructive reset/clean.

Nếu được phép:

```bash
git init -b <confirmed-default-branch>
git status --short --branch
```

Không commit `node_modules` hoặc generated `dist`. Không sửa source Prompt 2 trừ
khi G0 verification tìm ra defect liên quan trực tiếp.

### 8.3 Checkpoint B2 — public-project files

Tạo hoặc cập nhật tối thiểu:

```text
LICENSE
CONTRIBUTING.md
SECURITY.md
CODE_OF_CONDUCT.md
SUPPORT.md
MAINTAINERS.md
.github/ISSUE_TEMPLATE/bug_report.yml
.github/ISSUE_TEMPLATE/feature_request.yml
.github/ISSUE_TEMPLATE/config.yml
.github/pull_request_template.md
.github/workflows/ci.yml
README.md
package.json
.gitignore
```

Chỉ tạo `MAINTAINERS.md` bằng verified identity. Không tuyên bố team,
organization, sponsor hoặc maintainer khác nếu chưa có bằng chứng/consent.

Không tạo `CODEOWNERS` trong Prompt 3 trừ khi maintainer quyết định riêng về
owners và hiểu rằng CODEOWNERS là native authority input của PatchGate.

### 8.4 Content contract

#### README

README phải:

- nêu product boundary và five statuses chính xác;
- nêu local prototype/current milestone thật;
- phân biệt local evaluator evidence với live GitHub/Action evidence;
- có install/development commands đã chạy được;
- link constitution, architecture, threat model, contribution, security,
  support và roadmap;
- chỉ thêm CI/license badge sau khi URL/branch/license thật tồn tại;
- không gọi v0.1 complete;
- không nói production-ready, tamper-proof, cryptographically signed,
  compliance-certified hoặc universally secure;
- không nói đã có users/pilots nếu chưa có.

#### CONTRIBUTING

Phải có:

- supported local runtime và install path;
- command matrix: lint/typecheck/test/build/security/fixtures;
- fixture-manifest bijection rule;
- trust-boundary rules từ constitution;
- how to report bug versus security issue;
- PR size/scope expectations;
- authority rule: prose discovery không tự thành enforcement;
- explicit no-secrets rule;
- definition of evidence expected in PR.

#### SECURITY

Phải:

- dùng GitHub private vulnerability reporting nếu được bật và maintainer chọn;
- nếu chưa bật, ghi chính xác channel đã được maintainer cung cấp;
- không bịa email;
- yêu cầu không mở public issue cho vulnerability chưa phối hợp;
- nêu supported version trung thực: chưa có stable release;
- nêu trust-boundary focus;
- không hứa SLA nếu maintainer chưa cam kết;
- không coi PatchGate receipt là security certification.

#### CODE_OF_CONDUCT

Dùng current official version/template được maintainer chấp thuận, giữ
attribution bắt buộc và thay placeholder bằng verified contact/process. Không
để placeholder.

#### SUPPORT

Phân biệt:

- usage question;
- reproducible bug;
- feature proposal;
- security report;
- unsupported behavior.

Không cam kết commercial support hay response time.

#### Issue/PR templates

Issue forms phải có valid `name` và `description` fields để GitHub community
profile nhận diện. Security issue phải route sang SECURITY/private reporting,
không thu secret trong public form.

PR template phải yêu cầu:

- scope/linked issue;
- commands/evidence;
- policy/authority changes;
- security/trust-boundary impact;
- generated files;
- docs/fixture updates;
- không dùng checkbox để tự chứng minh check/workflow evidence.

### 8.5 Package metadata

Sau owner/slug/license confirmation, cập nhật chính xác:

- `license`;
- `repository`;
- `bugs`;
- `homepage`;
- `engines` chỉ khi runtime support đã được kiểm chứng;
- `files` chỉ chuẩn bị cho tương lai nếu đúng package contract.

Không bỏ `private: true`, không `npm publish` và không nâng thành release
version trong G0.

### 8.6 Minimal-permission CI

`.github/workflows/ci.yml` phải:

- chạy trên `pull_request` và push vào confirmed default branch;
- top-level `permissions: contents: read` hoặc hẹp hơn;
- không dùng `pull_request_target`;
- không có repository secrets cho PR job;
- checkout PR code chỉ trong untrusted `pull_request` job;
- dùng `npm ci`;
- chạy `npm run verify` và `npm run build`;
- có explicit timeout;
- có concurrency/cancel-in-progress an toàn;
- dùng supported Node runtime đã kiểm tra;
- pin third-party/official actions bằng full immutable commit SHA;
- có version comment cạnh SHA;
- resolve SHA live từ official upstream, không lấy từ model memory;
- không dùng cache có đường ghi trusted từ untrusted content;
- không upload receipt/artifact rồi tự coi nó trusted.

Nếu thêm `npm audit` vào CI, ghi rõ network/registry behavior. Local audit vẫn
phải được lưu evidence dù CI audit được tách.

### 8.7 Secret scan

Secret scan phải chạy thật trên tracked candidates và Git history sau khi có
history. Ưu tiên tool có version/output kiểm chứng được. Nếu tool không có:

- không tạo fake `test:secrets`;
- dùng một verified tool hoặc GitHub native scanning sau khi public;
- ghi rõ phần nào local, phần nào live;
- fail G0 nếu exit criterion chưa có bằng chứng.

Redact any finding in logs. Không commit scan report chứa secret.

### 8.8 Local verification checkpoint

Sau mọi thay đổi local:

```bash
npm ci
npm run verify
npm run build
npm run test:schema
npm run test:determinism
npm run test:fixtures
npm run test:security
npm audit --audit-level=high
```

Ngoài ra:

- parse mọi YAML/JSON;
- kiểm tra links local;
- kiểm tra no-placeholder;
- kiểm tra README/package/license consistency;
- kiểm tra workflow permissions/triggers/action pins;
- kiểm tra no `pull_request_target`;
- kiểm tra fixture manifest vẫn 1:1;
- kiểm tra working tree chỉ có intended changes.

Mỗi checkpoint giữ build/test xanh. Không gom tất cả sửa đổi rồi mới test.

## 9. Git history và publication sequence

Chỉ thực hiện phần đã được maintainer cho phép.

### 9.1 Commit strategy

Tạo commit nhỏ, có nghĩa:

1. baseline source/Prompt 2 evidence nếu cần một initial commit;
2. license/community/project metadata;
3. CI/security baseline;
4. review fixes nếu post-review tìm defect.

Không rewrite history sau khi public nếu không có lý do và approval rõ. Không
commit generated `dist`.

### 9.2 Remote safety preflight

Ngay trước tạo remote:

- xác nhận exact `owner/slug` một lần nữa;
- xác nhận authenticated account;
- xác nhận target chưa tồn tại hoặc hiểu rõ trạng thái target;
- xác nhận visibility;
- xác nhận description;
- hiển thị exact command dự kiến;
- xác nhận no secret/large-file issue;
- không dùng interactive prompt mơ hồ.

Không create/push nếu G0-MD-03 hoặc G0-MD-09 không phải `yes`.

### 9.3 Real PR and CI evidence

Nếu được phép:

1. tạo foundation branch có thay đổi thật;
2. push branch;
3. mở PR mô tả đúng scope và local evidence;
4. chờ check run thật;
5. đọc exact check conclusion, workflow run ID, attempt, event và SHA;
6. nếu fail, sửa root cause trên branch và chờ rerun;
7. không tự merge nếu G0-MD-11 không phải `yes`.

Không tạo empty/trivial PR chỉ để làm đẹp activity. PR phải chứa phần foundation
thực sự chưa nằm trên default branch.

### 9.4 Ruleset

Chỉ cấu hình sau khi:

- CI check name đã ổn định;
- PR CI đã pass thật;
- maintainer cho phép G0-MD-12;
- expected status check/source behavior được đọc từ GitHub API/Docs;
- bypass list và enforcement mode được trình bày trước.

Ruleset tối thiểu nên xem xét:

- require pull request;
- require CI status check;
- block force pushes/deletions;
- conversation resolution nếu phù hợp;
- không vô tình khóa maintainer khỏi recovery.

Không claim PatchGate check source protection vì product Action/App chưa tồn tại.
G0 ruleset chỉ bảo vệ baseline repository/CI.

## 10. Acceptance theo work package

### PG-001 — owner, slug, authority

Pass khi:

- owner/slug/visibility được maintainer ghi rõ;
- authenticated identity/permission được verify;
- không còn ambiguity về target.

### PG-002 — Git history

Pass khi:

- `.git` tồn tại;
- default branch đúng quyết định;
- commits có intended inventory;
- `git status --short --branch` được lưu;
- no secret/generated bulk committed.

### PG-003 — OSI license

Pass khi:

- SPDX ID do maintainer chọn;
- official text đúng;
- holder/year đúng;
- package/README/license nhất quán.

### PG-004 — community health

Pass khi:

- required files tồn tại và không có placeholder;
- GitHub community profile nhận diện sau publish;
- security/contact paths đúng;
- no invented identity/claim.

### PG-005 — baseline CI

Pass khi:

- local workflow audit pass;
- real PR check pass;
- minimal permissions;
- no privileged execution of PR code;
- build/test commands không phải placeholder.

### PG-006 — default branch ruleset

Pass khi:

- ruleset live;
- correct default branch;
- correct stable CI check;
- readback từ GitHub API/UI;
- recovery/bypass behavior documented.

### PG-007 — public repository

Pass khi:

- exact public URL hoạt động;
- default branch và commits visible;
- license/community files visible;
- PR/CI evidence accessible;
- no secret exposure;
- maintainer has verified write access.

### PG-008 — user-research foundation

Pass khi:

- task-based research protocol có consent/data-minimization rules;
- không quote/tên participant nào được công khai thiếu consent.

### PG-009 — candidate maintainer recruitment

Pass khi:

- có consent-safe log phân biệt invited, consented, session, shadow và
  enforcement states;
- recruitment không được gọi là adoption, active use hoặc pilot completion;
- candidate work chuẩn bị cho G2 task sessions và G4 shadow, không bypass gate.

Public bug/feature/support và private security routes là acceptance của
PG-004/G0 community foundation; chúng phải phân biệt rõ và dùng được sau publish.

## 11. Verification traceability matrix

Báo cáo cuối phải có matrix:

| Acceptance ID | Work package | Local/live | Command/API | Expected | Actual | Evidence URL/path | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

Tối thiểu map:

- G0-E01 public repository;
- G0-E02 Git/default branch;
- G0-E03 OSI license;
- G0-E04 community profile;
- G0-E05 PR CI;
- G0-E06 secret scan;
- G0-E07 ruleset readback;
- G0-E08 full local verification;
- G0-E09 no unsupported README/package claim;
- G0-E10 G1 technical/publication state remains correctly separated;
- G0-E11 feedback and private-security routes;
- G0-E12 research protocol and consent-safe candidate state.

Static YAML không được dùng làm actual evidence cho G0-E05/G0-E07.

## 12. Post-implementation adversarial review

Ba read-only subagents phải kiểm:

### Review R1 — legal/community drift

- license text/metadata mismatch;
- placeholder/contact hallucination;
- code-of-conduct attribution;
- public claim không có evidence;
- community profile path/format.

### Review R2 — CI/security boundary

- overbroad permissions;
- `pull_request_target` misuse;
- unpinned action;
- secrets/cache/artifact trust;
- fake or bypassable test/secret scan;
- PR check bound to wrong branch/event/SHA.

### Review R3 — delivery/evidence

- PG package dependency bypass;
- local proof gọi thành live proof;
- PR/ruleset/community readback thiếu;
- G1/G2/G3 status bị nâng quá sớm;
- application/program claim quá mức.

Main agent phải:

1. tự reproduce P0/P1;
2. sửa trong scope;
3. rerun full suite;
4. yêu cầu targeted re-review;
5. ghi residual P2 hoặc external blocker;
6. không dùng waiver để gọi G0 complete.

## 13. Báo cáo cuối

Tạo:

`docs/reviews/2026-08-13-prompt-03-public-foundation.md`

Báo cáo phải có:

1. verified baseline;
2. subagent assignments và findings;
3. maintainer decision ledger;
4. files changed;
5. license source/identity;
6. CI/security design;
7. Git commit/branch/remote/PR state;
8. exact command results;
9. live GitHub evidence URLs/IDs;
10. traceability matrix;
11. P0/P1/P2 findings register;
12. PG-001–PG-009 closure manifest;
13. G0 outcome;
14. G1 technical/publication state separation;
15. residual gaps;
16. exact next handoff.

Nếu G0 complete, cập nhật:

- `docs/agent-work-packages.yml`;
- `docs/implementation-roadmap.md`;
- `docs/agent-execution-plan.md`;
- `README.md`.

Chỉ sau khi mọi G0 exit criterion có executable/live evidence mới:

- đánh dấu G0 complete;
- giữ G1 `locally_verified` và ghi riêng G0 publication evidence;
- chuẩn bị Prompt 4 cho G2 preflight/onboarding theo UR-001–UR-107, gồm safe
  `init`, `validate`, `doctor` và ba task-based sessions.

Nếu G0 chưa complete, không viết Prompt 4 như thể G2 đã được phép bắt đầu. Chỉ
ghi blocker và exact maintainer/external action còn thiếu.

## 14. Completion statement

Final response ngắn nhưng phải nêu:

- Prompt 3/G0 complete hay chưa;
- local test counts;
- public repository URL nếu có;
- PR/CI/ruleset evidence nếu có;
- license;
- P0/P1 còn lại;
- action maintainer còn phải làm;
- link report;
- link next prompt chỉ khi dependency hợp lệ.

Không nói “đã lấy được ChatGPT Pro”. Theo official program page được kiểm tra
ngày 2026-08-13, maintainers có thể apply và quyết định chấp nhận thuộc OpenAI.
Mục tiêu của PatchGate là trở thành một dự án OSS công khai, hữu ích, an toàn và
có bằng chứng thật; không tối ưu bằng activity hay claim giả.

---

## 15. Lệnh bắt đầu

Bắt đầu ngay Chặng A:

1. đọc authority đầy đủ;
2. chạy baseline;
3. spawn ba read-only subagents;
4. tự kiểm findings;
5. tạo decision brief;
6. trình exact questions G0-MD-01 đến G0-MD-13;
7. dừng tại hard gate.

Không init Git, không thêm license, không tạo remote và không push trước câu trả
lời của maintainer.
