# ProVMS Enterprise 🎥

![Version](https://img.shields.io/badge/version-2.4.5-blue.svg)
![Electron](https://img.shields.io/badge/Electron-191970?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?logo=ffmpeg&logoColor=white)

**ProVMS Enterprise** là hệ thống phần mềm Quản lý và Giám sát Camera tập trung (VMS) chuyên nghiệp. Bằng việc áp dụng các công nghệ xử lý luồng Video tiên tiến nhất và cơ chế phần cứng tối đa, ProVMS mang lại hiệu năng giám sát khổng lồ trên những hệ thống máy tính phổ thông.

## 🔥 Tính năng Nổi bật (Phiên bản 2.4.5)

### 💻 Trải nghiệm Native Desktop App
- Giao diện được thiết kế độc quyền theo quy chuẩn Ứng dụng Desktop (Desktop-Class Responsiveness): Thanh công cụ và Menu Cài đặt được neo chặt (rigid), không bao giờ bị bóp méo hay vỡ khung khi thu phóng cửa sổ.
- Tích hợp tính năng **Khởi động cùng Windows** - tự động ghi Registry qua cầu nối IPC. Phần mềm tự động mở và chạy ngầm lưới Camera khi cắm điện.

### 🚀 Siêu Tăng tốc Phần cứng (Zero-Copy Hardware Acceleration)
- Ép toàn bộ phần cứng tham gia xử lý Video. Hỗ trợ **Zero-copy** (giải mã và nén 100% bên trong VRAM), giúp CPU gần như không phải hoạt động (tải 1-2%).
- **Intel Quick Sync (QSV):** Tận dụng tối đa iGPU của Intel, gánh hàng chục luồng không giới hạn.
- **NVIDIA NVENC:** Hỗ trợ siêu tốc độ mã hóa trên các dòng card Quadro hoặc GTX/RTX (sau khi patch).
- **AMD AMF:** Hỗ trợ máy chủ chạy chip Ryzen / card Radeon.
- **Auto Hybrid:** Tự động dùng GPU để giải mã (không giới hạn luồng) và dùng CPU nén nhẹ, đảm bảo tính tương thích tuyệt đối cho mọi cấu hình.

### 📊 Nhập liệu Thông minh (Smart Excel Import)
- Thêm hàng trăm Camera chỉ trong 1 giây qua file Excel.
- File mẫu tự động sinh ra 2 trang (Sheet) chuyên nghiệp: 1 trang hướng dẫn rõ ràng, 1 trang nhập liệu sạch sẽ.
- Trình phân tích (Parser) thông minh: Tự động đoán tên cột, chống lỗi vặt khi người dùng gõ sai định dạng. Số lượng thứ tự (STT) đếm mượt mà từ 1.

### 🖥️ Hỗ trợ Đa Màn hình (Multi-Monitor Kiosk Mode)
- Nút **"Mở màn hình phụ"** cho phép xuất luồng camera ra nhiều màn hình TV độc lập.
- Chế độ **Guest Viewer:** Màn hình phụ tự động ẩn các thanh điều khiển, không yêu cầu đăng nhập, đảm bảo giám sát 24/7 liền mạch.

### 🛡️ Bảo mật Cấp độ Doanh nghiệp
- **Auto-Logout 30 Phút:** Tự động thu hồi quyền Admin nếu người dùng không tương tác sau 30 phút.
- Màn hình chính sau khi bị thu hồi quyền sẽ **giữ nguyên lưới xem Camera** (không văng ra trang đăng nhập) để bảo vệ luồng giám sát liên tục.
- Ẩn toàn bộ tiến trình xử lý FFmpeg dưới Task Manager thành `provms-worker.exe` cực kỳ chuyên nghiệp.

### 🌐 Hoạt động LAN Độc lập (Offline-first)
- Không yêu cầu Internet.
- Phần mềm hoạt động như một Server. Chỉ cần chạy 1 lần file `Mo_Port_ProVMS.bat` để mở tường lửa. Các máy tính, điện thoại, máy tính bảng trong cùng mạng LAN chỉ cần gõ IP (vd: `192.168.1.100:3000`) là có thể xem Camera đồng bộ.

## ⚙️ Hướng dẫn Cài đặt & Đóng gói

Cài đặt các gói phụ thuộc:
```bash
npm install
cd frontend && npm install
cd ..
```

Chạy môi trường phát triển (Dev):
```bash
npm start
```

Đóng gói ra file cài đặt `.exe` cho Windows:
```bash
npm run build
```

*(File cài đặt sẽ được xuất ra tại thư mục `dist-app/`)*

## 📄 Bản quyền
Thuộc bản quyền sở hữu của **minhhan.net**. Hệ thống được đóng gói dành riêng cho môi trường bảo mật nội bộ và triển khai dự án quy mô vừa & lớn.

---
*Dự án được xây dựng và tối ưu với niềm đam mê!* ❤️
