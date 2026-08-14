# Prompt khởi chạy Prompt 4

Mở file `docs/prompts/prompt-04-authenticated-github-adapter.md`, đọc toàn bộ và
thực hiện trọn vẹn trong `/Users/macos/Desktop/Github`.

Đây là nhiệm vụ dài cho Gate G3. Không dừng sau plan, scaffold hoặc một happy
path test. Dùng đúng ba subagents read-only cho API/provenance, security/privacy
và contract/fixtures; main agent là editor duy nhất. Triển khai tuần tự
PG-301–PG-315 theo các slice trong prompt, giữ build/tests xanh sau mỗi slice,
rồi chạy audit–correction–re-audit cho đến khi không còn P0/P1 local.

Hoàn thành mọi mock/recorded-local work trước. Không init Git, tạo remote, push,
đăng check/comment, cài Action/App, đổi ruleset hoặc dùng token/repository live
nếu maintainer chưa cho phép rõ. Nếu live read-only smoke chưa được cấp quyền,
ghi `G3 mock_verified_live_smoke_pending`, không gọi G3 complete, và chỉ hỏi
exact owner/repo/target/credential scope sau khi local/mock DoD đã đạt.

Không được biến API error, 403/404, pagination cap, partial GraphQL data,
incomplete observation, stale/wrong source evidence hoặc target đổi giữa phiên
thành empty green result. Không được chạy pull-request code trong metadata hoặc
decision lane.
