# Review kết quả Prompt 1

**Ngày review:** 2026-08-13  
**Phạm vi:** PG-101 đến PG-107  
**Phương pháp:** agent chính và ba subagents review độc lập theo contract/schema,
determinism/evidence và security/architecture.

## Kết luận

Prompt 1 đã tạo được nền móng tốt nhưng chưa thể đánh dấu toàn bộ PG-101–PG-107
hoàn thành. Baseline sau corrective pass có 43 test pass, build/typecheck/lint
xanh và `npm audit` không báo vulnerability. Đây vẫn chỉ là local evaluator
evidence.

## Các lỗi đã sửa trong corrective pass

- ràng buộc `testedSha` với `headSha`, `mergeSha` hoặc `mergeGroupSha` theo
  `targetKind`;
- bắt buộc required check khai báo expected App source; `unattributed` không
  còn là expected source hợp lệ;
- yêu cầu GitHub Actions evidence ghi `workflowRunId` và GitHub App evidence có
  `appSlug` hoặc `appId`;
- lọc stale/foreign candidates trước khi xét duplicate để chúng không đầu độc
  check hợp lệ;
- phân biệt check hoàn tất nhưng conclusion không cho phép thành confirmed
  failure và `blocked`, thay vì `evidence_missing`;
- từ chối check có trạng thái `completed` nhưng không ghi `conclusion`;
- từ chối duplicate/conflicting policy source identity;
- kiểm timestamp theo ngày lịch thật, không chỉ regex hình thức;
- kiểm internal consistency của final status, reason IDs và receipt digest;
- thêm `changedPaths` vào receipt;
- chống input mutation làm thay đổi receipt đã phát hành;
- ổn định digest khi đổi thứ tự cả collection và các set-like arrays lồng nhau;
- dùng comparator canonical không phụ thuộc locale;
- từ chối các whitespace-only policy/check fields đã được semantic validator
  bao phủ và duplicate logical ownership IDs; Prompt 2 phải mở rộng quy tắc này
  cho toàn bộ contract;
- cho phép một team principal yêu cầu nhiều distinct human approvals thay vì
  giới hạn `requiredCount` bằng số principal cấu hình;
- giữ missing advisory reviewability snapshot ở mức advisory.

## Bằng chứng sau sửa

```text
npm run verify       PASS
npm run build        PASS
npm run test:schema  PASS
npm run test:determinism PASS
npm run test:fixtures PASS
npm audit            0 vulnerabilities
5 test files         PASS
43 tests             PASS
```

Các repro đã được kiểm lại:

- head target dùng unrelated `testedSha`: bị contract rejection;
- timestamp `2026-02-30T00:00:00Z`: CLI exit 2;
- current expected-source check có conclusion `failure`: final `blocked`;
- mutate input sau evaluation: receipt snapshot không đổi.

## Release blockers còn lại chuyển sang Prompt 2

1. Normalized policy object chưa có contract digest gắn với trusted base source;
   raw source digest và parsed policy vẫn là hai claim do adapter cung cấp.
2. Evaluation input chưa có schema version riêng và compatibility policy rõ.
3. Bare arrays chưa có observation metadata gồm `complete`, permission state,
   source, revision và retrieval provenance.
4. Ownership yêu cầu approval nhưng observation rỗng vẫn chưa phân biệt được
   “complete/no match” với “không lấy được dữ liệu”.
5. Linked issue chưa phân biệt complete zero-result với API unavailable.
6. Review identity mới chỉ có login; cần authenticated actor ID để deduplicate.
7. GitHub Actions evidence mới có run ID; chưa có stable workflow identity/path,
   event, run attempt và provenance để chống same-app same-name spoofing.
8. GitHub App evidence chưa có immutable `checkRunId`; một App identity đúng
   nhưng không có identity của check run thực sự vẫn có thể tạo green.
9. `policyChanged` vẫn là boolean do adapter khai báo, chưa derive/verify từ
   complete changed-path observation.
10. Core evaluator còn import schema validator có filesystem schema loading;
   cần tách validated boundary khỏi pure evaluation core.
11. Final delivery receipt cần làm rõ `evaluatedAt` bắt buộc ở envelope trong khi
    deterministic core không phụ thuộc wall-clock.
12. `evaluatorVersion` trong receipt đang là `0.1.0` trong khi package vẫn là
    `0.1.0-dev`; Prompt 2 phải định nghĩa một nguồn version nhất quán.

Vì các blocker trên, Prompt 2 phải bắt đầu bằng corrective observation/security
slice rồi mới đánh dấu PG-108–PG-110 hoàn thành.
