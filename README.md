# ProVMS Enterprise 🎥

![Version](https://img.shields.io/badge/version-2.9.18-blue.svg)
![Electron](https://img.shields.io/badge/Electron-191970?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?logo=ffmpeg&logoColor=white)

**ProVMS Enterprise** là hệ thống phần mềm Quản lý và Giám sát Camera tập trung (VMS) chuyên nghiệp. Bằng việc áp dụng các công nghệ xử lý luồng Video tiên tiến nhất và cơ chế phần cứng tối đa, ProVMS mang lại hiệu năng giám sát khổng lồ trên những hệ thống máy tính phổ thông.

## 🔥 Tính năng Nổi bật (Phiên bản 2.9.18)

### 💻 Trải nghiệm Native Desktop App
- **Giao diện Responsive Hoàn hảo:** Thiết kế độc quyền theo quy chuẩn Ứng dụng Desktop. Header và thanh công cụ tự động thu gọn chữ, giữ lại Icon khi thay đổi kích thước, không bao giờ bị bóp méo, vỡ khung hay xuất hiện thanh cuộn ngang/dọc gây khó chịu.
- **Chế độ System Tray (Chạy ngầm):** Ứng dụng có thể thu nhỏ xuống khay hệ thống, hoàn toàn gọn gàng.
- Tích hợp tính năng **Khởi động cùng Windows** - tự động ghi Registry qua cầu nối IPC. Phần mềm tự động chạy ngầm dưới khay hệ thống (`--hidden`) khi mở máy, sẵn sàng giám sát ngay lập tức.

### 🚀 Siêu Tăng tốc Phần cứng (Zero-Copy Hardware Acceleration & Native Rendering)
- Ép toàn bộ phần cứng tham gia xử lý Video. Hỗ trợ **Zero-copy** (giải mã và nén bên trong VRAM), giúp CPU gần như không phải hoạt động (tải 1-2%).
- **Native Image Rendering:** Gỡ bỏ Canvas truyền thống, đẩy toàn bộ luồng xuất hình ảnh từ WebSocket thẳng vào Engine C++ của trình duyệt (`<img>` + `ArrayBuffer`), đảm bảo khả năng render song song **64 Camera** hoàn toàn không giật lag.
- **Hardware Transcode Auto-Negotiation:** Cơ chế đàm phán hệ màu tự động (`-vf format=nv12`). Xử lý ngọt ngào các luồng H.265 10-bit từ NVR để ép về định dạng tương thích cho Intel/Nvidia nén.
- **Intel Quick Sync (QSV):** Tận dụng tối đa iGPU của Intel, gánh hàng chục luồng không giới hạn.
- **NVIDIA NVENC / AMD AMF:** Hỗ trợ siêu tốc độ mã hóa trên các dòng card rời.
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
