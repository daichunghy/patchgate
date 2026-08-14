# Prompt khởi chạy Prompt 3

Mở file
`docs/prompts/prompt-03-public-foundation-and-maintainer-decisions.md`, đọc toàn
bộ và thực hiện trọn vẹn trong `/Users/macos/Desktop/Github`.

Prompt 3 bắt buộc dùng ba subagents read-only, còn main agent là editor duy
nhất. Trước tiên chỉ audit và tạo G0 maintainer decision brief. Phải dừng tại
G0-MD-01 đến G0-MD-13; không được tự init Git, chọn license, tạo public remote,
push, mở/merge PR hoặc cấu hình ruleset chỉ vì GitHub CLI đang authenticated.

Sau khi maintainer trả lời, tiếp tục cùng task và thực hiện đúng phần được cho
phép. Chỉ gọi G0 complete khi public repo, OSI license, community files, real PR
CI, secret scan và ruleset đều có executable/live evidence. Đồng thời hoàn tất
PG-008/009: feedback/security routes, consent-safe research protocol và
candidate-state log không phóng đại adoption. Nếu một tiêu chí thiếu, báo exact
blocker. G1 vẫn `locally_verified`; public Action/pilot/release không được vượt
G0.
