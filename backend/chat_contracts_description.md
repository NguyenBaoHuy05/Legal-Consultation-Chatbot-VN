# Mô tả Hệ thống Chat Hợp đồng

## Tổng quan
Hệ thống chat hợp đồng là một phần mở rộng của hệ thống chat, được thiết kế để hỗ trợ người dùng tạo và quản lý các hợp đồng pháp lý. Hệ thống này sử dụng các thành phần cốt lõi giống như hệ thống chat, với logic bổ sung để xử lý các truy vấn liên quan đến hợp đồng.

## Luồng hoạt động
1. **Tương tác người dùng**:
   - Người dùng gửi truy vấn liên quan đến hợp đồng thông qua giao diện frontend.

2. **Frontend**:
   - Frontend gửi truy vấn của người dùng đến backend thông qua yêu cầu API.

3. **Backend**:
   - Backend xác thực thông tin đăng nhập của người dùng.
   - Nếu xác thực thành công, backend chuyển truy vấn đến RAG Engine.

4. **RAG Engine**:
   - RAG Engine truy vấn cơ sở dữ liệu vector Pinecone để lấy các mẫu hợp đồng liên quan.
   - RAG Engine lấy thêm ngữ cảnh hoặc tài liệu từ cơ sở dữ liệu.
   - RAG Engine gửi truy vấn cùng với ngữ cảnh đã lấy được đến Google Generative AI (Gemini).

5. **Google Generative AI (Gemini)**:
   - Gemini xử lý truy vấn và tạo phản hồi hợp đồng.

6. **RAG Engine**:
   - RAG Engine nhận phản hồi từ Gemini và gửi lại cho backend.

7. **Backend**:
   - Backend chuyển phản hồi đến frontend.

8. **Frontend**:
   - Frontend hiển thị phản hồi hợp đồng cho người dùng.

## Kết nối giữa các thành phần
- **1 → 2**: Người dùng tương tác với giao diện và gửi truy vấn.
- **2 → 3**: Frontend gửi yêu cầu API đến backend.
- **3 → 4**: Backend chuyển truy vấn đến RAG Engine.
- **4 → 4**: RAG Engine truy vấn Pinecone và cơ sở dữ liệu để lấy ngữ cảnh.
- **4 → 5**: RAG Engine gửi truy vấn đến Gemini.
- **5 → 6**: Gemini trả về phản hồi cho RAG Engine.
- **6 → 7**: RAG Engine gửi phản hồi đến backend.
- **7 → 8**: Backend chuyển phản hồi đến frontend để hiển thị.

## Các thành phần
- **Frontend**: Được xây dựng bằng React/Next.js, xử lý tương tác người dùng.
- **Backend**: Được xây dựng bằng FastAPI, quản lý yêu cầu API và xác thực người dùng.
- **RAG Engine**: Xử lý việc truy xuất và bổ sung dữ liệu.
- **Pinecone**: Cơ sở dữ liệu vector để lưu trữ và truy xuất embeddings.
- **Google Generative AI (Gemini)**: Tạo phản hồi hợp đồng dựa trên truy vấn và ngữ cảnh.

---
