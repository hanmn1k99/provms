# Changelog 📝

Tất cả những thay đổi nổi bật của dự án **ProVMS Enterprise** sẽ được ghi chép tại đây.

## [2.5.0] - 2026-09-19
### Thêm mới (Added)
- **Tích hợp API phần cứng (Native SDK Integration):** Tích hợp sâu giao thức ISAPI (Hikvision) và CGI (Dahua). 
- **Điều khiển PTZ:** Bổ sung Overlay điều khiển Quay quét / Thu phóng (PTZ) trên giao diện xem Camera toàn màn hình. Các lệnh PTZ được gọi ngầm trực tiếp qua giao thức REST của hãng (không thông qua RTSP ONVIF) đem lại độ phản hồi cực nhanh.
- **Auto-Detect Streams:** Tự động điền link Luồng Phụ (Sub-stream) vào DataBase khi thêm camera Hikvision/Dahua. Giao diện Lưới tự động gọi luồng phụ (H.264) để chống 100% lỗi xám hình. Khi xem đơn mới kích hoạt luồng chính (Main-stream 4K H.265).

## [2.4.5] - 2026-09-18
### Thêm mới (Added)
- **Khởi động cùng Windows:** Thêm tab *Cấu hình Hệ thống* (System Settings) cho phép người dùng tự do bật/tắt tính năng khởi động phần mềm cùng máy tính thông qua IPC hook trực tiếp vào Windows Registry.
- **Desktop-Native Responsive UI:** Thiết kế lại cơ chế co giãn giao diện. Các thanh công cụ và Sidebar (Cài đặt) được khóa kích thước chặt chẽ (`flex-shrink: 0`), trong khi lưới Camera tự động lấp đầy phần không gian còn lại. Không còn hiện tượng vỡ, rớt dòng hay bị bóp méo khi thu phóng cửa sổ.

### Sửa đổi (Fixed)
- Sửa lỗi nút gạt Khởi động cùng Windows không hoạt động (lỗi thiếu đóng gói file `preload.js` của Electron).
- Tối ưu kích thước Sidebar Cài đặt (thu nhỏ xuống 200px).

## [2.3.0] - 2026-09-18
### Thêm mới (Added)
- **Zero-Copy Hardware Acceleration:** Tích hợp bộ mã hóa/giải mã phần cứng chuyên sâu không copy qua lại VRAM-RAM. Hỗ trợ Intel QSV, NVIDIA NVENC và AMD AMF, giảm tải CPU xuống tiệm cận 0% khi gánh 64 camera.
- **Multi-Monitor Kiosk Mode:** Thêm nút *Mở màn hình phụ*. Tự động mở các cửa sổ mới ở chế độ Guest Viewer phục vụ giám sát 24/7 mà không lo bị văng đăng nhập.
- **Smart Excel Import:** Cải tiến tính năng Nhập hàng loạt qua Excel với file mẫu mới có 2 Sheet (1 hướng dẫn, 1 dữ liệu), tự động phân tích và sửa lỗi định dạng.

### Sửa đổi (Changed)
- **Guest View Default:** Thay đổi triết lý khởi động. Khi mở ứng dụng, phần mềm luôn vào thẳng màn hình Giám sát Lưới thay vì chặn lại ở màn hình Đăng nhập Admin.
- Đếm STT (Số thứ tự) thông minh trên giao diện, tách biệt hoàn toàn với ID của Database để không bị nhảy số khi xóa Camera.

## [2.2.0] - 2026-09-17
### Thêm mới (Added)
- Chế độ tự động đăng xuất Admin (Auto-Logout) sau 30 phút không tương tác, tự động thu hồi quyền bảo vệ hệ thống (nhưng vẫn duy trì xem cam).
- Cập nhật Layout hiển thị trên màn hình 4K siêu lớn: Lưới 25, 32 (8x4), 36 và 64 Camera.
- Ẩn danh tiến trình FFmpeg dưới Task Manager thành `provms-worker.exe`.
- Cập nhật giao diện Khôi phục Mật khẩu ẩn (Master Key) liền mạch không qua hàm Prompt của Windows.

## [2.1.0] - Các phiên bản trước
### Khởi tạo (Init)
- Xây dựng kiến trúc React.js + Vite kết hợp Electron.
- Xử lý luồng RTMP/FLV qua WebSockets với Node-Media-Server cho độ trễ tiệm cận 0.
- Đóng gói Database SQLite độc lập và an toàn trong `%APPDATA%`.
