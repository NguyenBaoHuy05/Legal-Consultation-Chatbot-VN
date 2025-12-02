# Đặc Tả File `app.py`

## Tổng Quan
File `app.py` là điểm khởi đầu của ứng dụng backend, được xây dựng bằng Streamlit. Ứng dụng này cung cấp giao diện người dùng để tương tác với chatbot tư vấn pháp luật, sử dụng các công nghệ như Pinecone, Gemini, và RAG (Retrieval-Augmented Generation).

---

## Chức Năng Chính

### 1. Cấu Hình Giao Diện
- **`st.set_page_config`**: Đặt tiêu đề, biểu tượng và bố cục cho trang.
- **Custom CSS**: Tùy chỉnh giao diện người dùng, bao gồm màu nền, vị trí ô nhập liệu, và kiểu hiển thị tin nhắn.

### 2. Quản Lý Trạng Thái Phiên (Session State)
- **`st.session_state.messages`**: Lưu lịch sử hội thoại giữa người dùng và chatbot.
- **`st.session_state.rag_system`**: Đối tượng RAGSystem để quản lý cơ sở dữ liệu vector.
- **`st.session_state.vector_db_ready`**: Trạng thái kết nối cơ sở dữ liệu vector (Pinecone).

### 3. Thanh Bên (Sidebar)
- **Cấu hình API**:
  - Nhập API Key cho Gemini và Pinecone.
  - Nhập tên index của Pinecone.
  - Kết nối đến cơ sở dữ liệu Pinecone.
- **Tải lên tài liệu**:
  - Cho phép người dùng tải lên các tài liệu pháp luật (PDF/TXT).
  - Xử lý và lưu trữ tài liệu vào cơ sở dữ liệu vector.
- **Hướng dẫn sử dụng**: Hiển thị các bước hướng dẫn cơ bản.

### 4. Giao Diện Chính
- Hiển thị lịch sử hội thoại.
- Nhận câu hỏi từ người dùng qua ô nhập liệu.
- Tạo phản hồi từ chatbot dựa trên:
  - API Key của Gemini.
  - Trạng thái kết nối cơ sở dữ liệu Pinecone.

---

## Các Thành Phần Chính

### 1. **RAGSystem**
- Được sử dụng để:
  - Kết nối đến Pinecone.
  - Tải và xử lý tài liệu.
  - Tạo cơ sở dữ liệu vector.
  - Truy xuất ngữ cảnh liên quan đến câu hỏi của người dùng.

### 2. **GeminiBot**
- Được sử dụng để:
  - Tạo phản hồi dựa trên câu hỏi và ngữ cảnh truy xuất.

---

## Quy Trình Hoạt Động

1. **Khởi Tạo Ứng Dụng**:
   - Cấu hình giao diện và trạng thái phiên.
2. **Kết Nối Pinecone**:
   - Người dùng nhập API Key và tên index.
   - Hệ thống kiểm tra và kết nối đến cơ sở dữ liệu vector.
3. **Tải Lên Tài Liệu**:
   - Người dùng tải lên tài liệu.
   - Hệ thống xử lý và lưu trữ tài liệu vào Pinecone.
4. **Hội Thoại**:
   - Người dùng nhập câu hỏi.
   - Hệ thống truy xuất ngữ cảnh từ Pinecone.
   - Chatbot tạo phản hồi và hiển thị cho người dùng.

---

## Cách Chạy Ứng Dụng
1. Cài đặt các thư viện phụ thuộc:
   ```bash
   pip install -r requirements.txt
   ```
2. Chạy ứng dụng:
   ```bash
   streamlit run app.py
   ```

---

## Các Thư Viện Sử Dụng
- **Streamlit**: Tạo giao diện người dùng.
- **Pinecone**: Lưu trữ và truy xuất cơ sở dữ liệu vector.
- **GeminiBot**: Tạo phản hồi chatbot.

---

## Ghi Chú
- Đảm bảo nhập đúng API Key và tên index của Pinecone.
- Tài liệu tải lên phải ở định dạng PDF hoặc TXT.
- Nếu không có tài liệu hoặc kết nối Pinecone thất bại, chatbot sẽ không hoạt động.

---

## Tệp Liên Quan
- **`rag_engine.py`**: Chứa logic của RAGSystem.
- **`chatbot.py`**: Chứa logic của GeminiBot.