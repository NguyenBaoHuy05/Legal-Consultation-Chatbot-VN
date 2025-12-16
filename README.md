# Legal Consultation Chatbot VN

**Legal Consultation Chatbot VN** là một hệ thống chatbot tư vấn pháp luật thông minh được xây dựng nhằm hỗ trợ người dùng giải đáp các thắc mắc pháp lý và soạn thảo hợp đồng tự động. Dự án sử dụng công nghệ RAG (Retrieval Augmented Generation) kết hợp với Google Gemini AI để đưa ra các câu trả lời chính xác dựa trên kho dữ liệu văn bản pháp luật Việt Nam.

## 🌟 Tính Năng Chính

*   **Tư Vấn Pháp Lý Thông Minh:** Chatbot có khả năng hiểu và trả lời các câu hỏi pháp lý phức tạp nhờ vào mô hình ngôn ngữ lớn (LLM) Gemini, được tăng cường bởi dữ liệu pháp luật thực tế qua RAG.
*   **Hệ Thống RAG (Retrieval Augmented Generation):** Sử dụng Pinecone Vector Database để tìm kiếm và trích xuất các đoạn văn bản luật liên quan nhất, giúp AI trả lời có căn cứ và giảm thiểu ảo giác (hallucination).
*   **Soạn Thảo Hợp Đồng Tự Động:**
    *   Người dùng có thể yêu cầu tạo hợp đồng (ví dụ: hợp đồng lao động, thuê nhà).
    *   Hệ thống tự động hỏi các thông tin cần thiết và điền vào mẫu hợp đồng chuẩn.
    *   Xuất ra file `.docx` hoàn chỉnh cho người dùng tải về.
*   **Quản Lý Tài Khoản & Phân Quyền:**
    *   Đăng ký, đăng nhập, và xác thực email.
    *   Cơ chế người dùng Miễn phí (Free) và Trả phí (Premium/Subscription).
    *   Giới hạn lượt chat hàng ngày cho tài khoản miễn phí.
*   **Admin Dashboard:**
    *   Quản lý người dùng và nâng cấp gói dịch vụ.
    *   Upload và chỉ mục hóa tài liệu pháp luật mới vào hệ thống RAG (hỗ trợ file `.docx`, `.pdf`, v.v.).
    *   Quản lý các mẫu hợp đồng.
*   **Lưu Trữ & Bảo Mật:**
    *   Lưu trữ lịch sử chat.
    *   Bảo mật thông tin người dùng và mã hóa API Key cá nhân.

## 🛠 Công Nghệ Sử Dụng

### Backend
*   **Ngôn ngữ:** Python
*   **Framework:** FastAPI (High performance API)
*   **Database:** MongoDB (lưu trữ user, chat history) & Motor (Async driver)
*   **AI & LLM:** Google Gemini (Generative AI), LangChain (Framework hỗ trợ RAG - *nếu có sử dụng, dựa trên code thấy RAGSystem tự viết hoặc dùng thư viện*)
*   **Vector Database:** Pinecone (lưu trữ vector embeddings của văn bản luật)
*   **Storage:** Supabase Storage (lưu trữ file mẫu hợp đồng)
*   **Xử lý tài liệu:** `python-docx`, `docxtpl` (xử lý Word template)
*   **Authentication:** JWT (JSON Web Tokens)

### Frontend
*   **Framework:** Next.js (React Framework)
*   **Styling:** Tailwind CSS
*   **Language:** TypeScript
*   **HTTP Client:** Axios
*   **UI Components:** React-Toastify (thông báo), React-Markdown (hiển thị nội dung chat)

## ⚙️ Yêu Cầu Hệ Thống

*   **Python:** 3.9+
*   **Node.js:** 18+
*   **MongoDB:** Local hoặc Cloud (MongoDB Atlas)
*   **Tài khoản & API Keys:**
    *   Google Gemini API Key
    *   Pinecone API Key & Index
    *   Supabase Project (URL & Key)
    *   Email Service (SMTP) để gửi mail xác thực

## 🚀 Hướng Dẫn Cài Đặt

### 1. Clone dự án

```bash
git clone https://github.com/NguyenBaoHuy05/Legal-Consultation-Chatbot-VN.git
cd Legal-Consultation-Chatbot-VN
```

### 2. Cài đặt Backend

Di chuyển vào thư mục backend:

```bash
cd backend
```

Tạo và kích hoạt môi trường ảo (Virtual Environment):

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Linux/macOS
python3 -m venv venv
source venv/bin/activate
```

Cài đặt các thư viện cần thiết:

```bash
pip install -r requirements.txt
```

Cấu hình biến môi trường:
Tạo file `.env` trong thư mục `backend` và điền các thông tin sau (tham khảo `.env.example`):

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=legal_chatbot
SECRET_KEY=your_super_secret_key_for_jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google Gemini
GOOGLE_API_KEY=your_gemini_api_key

# Pinecone (Vector DB)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=legal-chatbot

# Supabase (Storage)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_BUCKET=contracts
SUPABASE_LINK_BUCKET=your_supabase_public_link_base

# Email Configuration (Gmail SMTP)
EMAIL_FROM=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

Chạy Server Backend:

```bash
uvicorn main:app --reload
```
Backend sẽ chạy tại: `http://localhost:8000`

### 3. Cài đặt Frontend

Mở một terminal mới và di chuyển vào thư mục frontend:

```bash
cd frontend
```

Cài đặt các dependencies:

```bash
npm install
# hoặc
yarn install
```

Cấu hình biến môi trường:
Tạo file `.env.local` trong thư mục `frontend`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Chạy Server Frontend:

```bash
npm run dev
```
Frontend sẽ chạy tại: `http://localhost:3000`

## 📖 Hướng Dẫn Sử Dụng

1.  Truy cập `http://localhost:3000`.
2.  **Đăng ký tài khoản:** Tạo tài khoản mới và kiểm tra email để xác thực.
3.  **Đăng nhập:** Truy cập vào hệ thống.
4.  **Tư vấn luật:** Nhập câu hỏi vào khung chat. Hệ thống sẽ tìm kiếm thông tin và trả lời.
5.  **Tạo hợp đồng:**
    *   Chọn tính năng tạo hợp đồng (hoặc chat yêu cầu tạo hợp đồng).
    *   Cung cấp các thông tin theo yêu cầu của Chatbot.
    *   Nhận link tải file hợp đồng đã điền thông tin.
6.  **Admin (Dành cho quản trị viên):**
    *   Truy cập panel admin (nếu có UI) hoặc sử dụng API để upload tài liệu pháp luật mới vào hệ thống để AI "học".

## 🤝 Đóng Góp (Contributing)

Mọi đóng góp đều được hoan nghênh! Vui lòng tạo Pull Request hoặc mở Issue để thảo luận về các thay đổi.

1.  Fork dự án
2.  Tạo feature branch (`git checkout -b feature/TinhNangMoi`)
3.  Commit thay đổi (`git commit -m 'Thêm tính năng mới'`)
4.  Push lên branch (`git push origin feature/TinhNangMoi`)
5.  Mở Pull Request

## 📄 Giấy Phép (License)

Dự án này được cấp phép theo giấy phép **Apache License 2.0**. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.