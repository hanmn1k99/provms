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

## Công nghệ sử dụng 🛠️
- **Frontend**: React.js, Vite, flv.js
- **Backend**: Node.js, Express, Node-Media-Server (RTMP/FLV)
- **Desktop Framework**: Electron
- **Database**: Database SQLite3 siêu tốc
- **Xử lý luồng**: FFmpeg

## Tác giả 👨‍💻
* **Nguyễn Minh Hân** (Dev lỏ)
* 📧 Email: [han@minhhan.net](mailto:han@minhhan.net)
* 🌐 Website: [minhhan.net](https://minhhan.net)

---
*Dự án được xây dựng và tối ưu với niềm đam mê!* ❤️
