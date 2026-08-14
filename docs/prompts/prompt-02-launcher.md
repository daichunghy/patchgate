# Prompt khởi chạy Prompt 2

Copy nguyên khối dưới đây vào một task Codex mới mở tại
`/Users/macos/Desktop/Github`:

```text
Hãy đọc toàn bộ PROJECT_CONSTITUTION.md, AGENTS.md và file
docs/prompts/prompt-02-observation-contract-and-compatibility.md, sau đó thực thi
trọn vẹn Prompt 2 trên source hiện tại.

Đây là implementation task, không phải task chỉ lập kế hoạch. Bắt buộc dùng ít
nhất 3 subagents review read-only trước implementation và ít nhất 2 subagents
post-review. Agent chính là editor duy nhất. Hãy tự kiểm chứng mọi finding, triển
khai theo từng slice, cập nhật schemas/fixtures/tests/docs/backlog, chạy đủ
verification và tiếp tục sửa đến khi đạt terminal state.

Không được báo complete nếu còn P0/P1, fixture không có oracle, collection thiếu
vẫn tạo green, hoặc chỉ có local evidence nhưng claim GitHub/live/Gate proof.
Nếu chưa đạt Definition of Done, trả partial cùng exact blocker, repro, test ID
và work package tiếp theo. Không init Git, chọn license, publish hay nộp chương
trình nếu chưa có quyết định trực tiếp của tôi.
```

File đặc tả dài là authority của lượt thực thi. Prompt khởi chạy này chỉ giúp mở
task; không thay thế bất kỳ acceptance criterion nào trong đặc tả.
