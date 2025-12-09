# Mô tả Luồng Hoạt Động từ Tài Liệu PDF đến RAG

## Tổng quan
Hệ thống được thiết kế để xử lý tài liệu PDF ban đầu, trích xuất thông tin và lưu trữ dữ liệu trong cơ sở dữ liệu vector (Pinecone) để hỗ trợ truy vấn thông minh thông qua RAG (Retrieval-Augmented Generation).

## Luồng Hoạt Động

1. **Tải lên tài liệu PDF**:
   - Người dùng hoặc admin tải lên tài liệu PDF thông qua giao diện frontend.

2. **Frontend gửi yêu cầu đến Backend**:
   - Frontend gửi tài liệu PDF đến backend thông qua API.

3. **Lưu trữ tạm thời**:
   - Backend lưu trữ tài liệu PDF vào thư mục tạm thời trên server.

4. **Xử lý tài liệu PDF**:
   - Backend sử dụng các công cụ xử lý tài liệu (như PyPDF2 hoặc pdfplumber) để trích xuất nội dung từ tài liệu PDF.

5. **Tạo vector từ nội dung**:
   - Nội dung trích xuất từ tài liệu PDF được chuyển thành vector bằng cách sử dụng mô hình nhúng (embedding model).

6. **Lưu trữ vector vào Pinecone**:
   - Các vector được lưu trữ vào cơ sở dữ liệu vector Pinecone cùng với metadata (như tên tài liệu, nguồn, và các thông tin liên quan).

7. **Truy vấn thông minh**:
   - Khi người dùng gửi truy vấn, RAG Engine sẽ truy vấn Pinecone để lấy các vector liên quan.
   - RAG Engine kết hợp các vector và ngữ cảnh để tạo phản hồi thông minh.

## Các thành phần chính

- **Frontend**:
  - Giao diện người dùng để tải lên tài liệu PDF.

- **Backend**:
  - Xử lý tài liệu PDF và tạo vector.
  - Lưu trữ vector vào Pinecone.

- **Pinecone**:
  - Cơ sở dữ liệu vector để lưu trữ và truy xuất các vector.

- **RAG Engine**:
  - Truy vấn Pinecone và kết hợp ngữ cảnh để tạo phản hồi thông minh.

## Kết nối giữa các thành phần

- **1 → 2**: Người dùng tải lên tài liệu PDF thông qua frontend.
- **2 → 3**: Frontend gửi tài liệu đến backend.
- **3 → 4**: Backend lưu trữ tài liệu tạm thời và trích xuất nội dung.
- **4 → 5**: Nội dung được chuyển thành vector.
- **5 → 6**: Vector được lưu trữ vào Pinecone.
- **6 → 7**: RAG Engine truy vấn Pinecone để lấy ngữ cảnh liên quan.

---