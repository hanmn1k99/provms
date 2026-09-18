# ProVMS Enterprise 🎥

![Version](https://img.shields.io/badge/version-2.1.5-blue.svg)
![Electron](https://img.shields.io/badge/Electron-191970?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?logo=vite&logoColor=FFD62E)
![SQLite](https://img.shields.io/badge/SQLite-07405E?logo=sqlite&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?logo=ffmpeg&logoColor=white)

ProVMS Enterprise là hệ thống quản lý và giám sát Camera tập trung (VMS) dành cho doanh nghiệp. 
Được xây dựng trên nền tảng công nghệ web hiện đại kết hợp với sức mạnh của FFmpeg, mang lại trải nghiệm xem mượt mà, độ trễ thấp và khả năng hiển thị đồng thời lên tới 100+ Camera.

## Tính năng nổi bật ✨
- **Giám sát thời gian thực**: Hỗ trợ chia lưới linh hoạt (4, 16 camera) với công nghệ luồng WebSocket/FLV độ trễ cực thấp.
- **Nhập liệu hàng loạt (Bulk Import)**: Nhập hàng trăm Camera vào hệ thống chỉ trong 1 giây thông qua file mẫu Excel.
- **Đa phương thức giải mã**: Hỗ trợ giải mã bằng CPU, GPU (NVIDIA NVENC) hoặc Direct Copy Stream để tối ưu phần cứng.
- **Quản lý linh hoạt**: Giao diện UI/UX trực quan, hỗ trợ quản lý tài khoản và phân quyền Admin/User chặt chẽ.
- **Chạy độc lập (Offline-first)**: Toàn bộ dữ liệu được lưu trữ an toàn trong máy tính nội bộ thông qua SQLite (không yêu cầu Internet).

## Đặc tả kỹ thuật ⚙️
- **Hệ điều hành**: Windows 10 / Windows 11 (64-bit)
- **Frontend Core**: React 18, Vite, `flv.js` (WebSockets-FLV)
- **Backend & Streaming**: Node.js (Express), Node-Media-Server (RTMP -> FLV)
- **Giao thức Stream**: `RTSP` -> `FFmpeg` (Muxer) -> `RTMP` -> `WS-FLV`
- **Database**: SQLite3. Dữ liệu được lưu an toàn tại `%APPDATA%\minhhan.net\provms\database.db`
- **Tối ưu kết nối**: Sử dụng giao thức WebSocket (`ws://`) thay cho HTTP (`http://`) giúp phá vỡ giới hạn 6 kết nối mặc định của trình duyệt, cho phép mở hàng trăm luồng video cùng lúc.

## Hướng dẫn sử dụng 📖
### 1. Đăng nhập & Khôi phục
- Lần đầu mở app, hệ thống sẽ yêu cầu thiết lập tài khoản Admin.
- Hệ thống hỗ trợ Auto-login ở các lần sau.
- Hỗ trợ cơ chế khôi phục tài khoản Admin an toàn (vui lòng liên hệ nhà phát triển để được hỗ trợ).

### 2. Quản lý Camera (Nhập hàng loạt)
- Vào **Cài đặt Hệ thống** > **Quản lý Camera**.
- Bấm **Tải Mẫu Excel** để lấy định dạng chuẩn.
- Điền thông tin Camera. Tại cột **Giải mã**, nhập:
  - `1`: Copy Stream (Khuyên dùng - Nhẹ máy nhất, yêu cầu cam H.264)
  - `2`: Chế độ H.265 (Tự động nhận diện và giải mã H.265 bằng GPU NVIDIA/Intel/AMD kết hợp CPU, phá vỡ giới hạn khóa 8 luồng)
  - `3`: Chế độ Phần mềm (Chỉ dùng CPU)
- Bấm **Nhập từ Excel**, các camera sẽ được khởi tạo đường link RTSP tự động và đưa vào database.

### 3. Truy cập từ máy khác trong cùng mạng LAN 🌍
ProVMS được thiết kế để phát sóng nội bộ. Máy tính cài app đóng vai trò là **Server** (gánh vác việc xử lý CPU/GPU để giải nén video). Các máy tính khác trong cùng mạng WiFi/LAN chỉ cần mở trình duyệt web lên để xem mà không phải xử lý nặng.
- **Cách truy cập**: Từ máy tính khác, mở Google Chrome và truy cập địa chỉ `http://IP_MÁY_CHỦ:3000` (VD: `http://192.168.1.10:3000`).
- **Lưu ý**: Bạn cần mở port `3000` và `8000` trên Windows Firewall của Máy chủ để các máy khác kết nối được (có thể chạy script `.bat` tự động đính kèm).

### 4. Xóa Camera hàng loạt
- Tại bảng Quản lý Camera, tick chọn các ô kiểm (checkbox) ở đầu mỗi dòng.
- Bấm **Xóa N mục** (nút màu đỏ) để dọn dẹp hệ thống nhanh chóng.

## Công nghệ sử dụng 🛠️
- **Frontend**: React.js, Vite, flv.js
- **Backend**: Node.js, Express, Node-Media-Server
- **Desktop Framework**: Electron
- **Xử lý luồng**: FFmpeg (Kèm sẵn trong bộ cài)

## Tác giả 👨‍💻
* **Nguyễn Minh Hân** (Dev lỏ)
* 📧 Email: [han@minhhan.net](mailto:han@minhhan.net)
* 🌐 Website: [minhhan.net](https://minhhan.net)

---
*Dự án được xây dựng và tối ưu với niềm đam mê!* ❤️
