# Đặc Tả File `rag_engine.py`

## Tổng Quan
File `rag_engine.py` triển khai lớp `RAGSystem`, chịu trách nhiệm xử lý các chức năng liên quan đến **RAG (Retrieval-Augmented Generation)**. Lớp này sử dụng Pinecone để lưu trữ và truy xuất cơ sở dữ liệu vector, đồng thời sử dụng mô hình nhúng ngôn ngữ `keepitreal/vietnamese-sbert` để tạo vector nhúng từ tài liệu và truy vấn.

---

## Chức Năng Chính

### 1. Tải Tài Liệu
- **`load_documents`**:
  - Tải tài liệu từ các tệp PDF hoặc TXT được tải lên.
  - Chuyển đổi tài liệu thành danh sách các đối tượng `Document`.

### 2. Tạo Cơ Sở Dữ Liệu Vector
- **`create_vector_db`**:
  - Chia nhỏ tài liệu thành các đoạn văn bản nhỏ (chunk).
  - Tạo cơ sở dữ liệu vector trong Pinecone từ các đoạn văn bản.
  - Tự động tạo index trong Pinecone nếu chưa tồn tại.

### 3. Truy Xuất Thông Tin
- **`retrieve`**:
  - Truy xuất các đoạn văn bản liên quan nhất từ cơ sở dữ liệu vector dựa trên truy vấn của người dùng.

### 4. Quản Lý Index
- **`save_index`**:
  - Lưu trạng thái index (Pinecone tự động lưu trên cloud, hàm này chỉ là placeholder).
- **`load_index`**:
  - Kết nối đến index Pinecone đã tồn tại.

---

## Các Thành Phần Chính

### 1. **Cấu Hình**
- **`pinecone_api_key`**: API Key để kết nối đến Pinecone.
- **`index_name`**: Tên index trong Pinecone.
- **`HuggingFaceEmbeddings`**: Mô hình nhúng ngôn ngữ `keepitreal/vietnamese-sbert` với kích thước vector là 768.
- **`RecursiveCharacterTextSplitter`**: Công cụ chia nhỏ tài liệu thành các đoạn văn bản với kích thước 1000 ký tự và độ chồng lấn 200 ký tự.

### 2. **Thư Viện Sử Dụng**
- **`langchain_community`**: Tải tài liệu và tạo nhúng.
- **`pinecone`**: Lưu trữ và truy xuất cơ sở dữ liệu vector.
- **`os`**: Quản lý các biến môi trường và tệp tạm thời.
- **`time`**: Xử lý thời gian chờ khi tạo index.

---

## Quy Trình Hoạt Động

1. **Tải Tài Liệu**:
   - Người dùng tải lên tệp PDF hoặc TXT.
   - Hệ thống đọc và chuyển đổi tài liệu thành danh sách các đối tượng `Document`.
2. **Tạo Cơ Sở Dữ Liệu Vector**:
   - Chia nhỏ tài liệu thành các đoạn văn bản.
   - Tạo vector nhúng từ các đoạn văn bản.
   - Lưu trữ vector vào Pinecone.
3. **Truy Xuất Thông Tin**:
   - Người dùng nhập truy vấn.
   - Hệ thống tìm kiếm các đoạn văn bản liên quan nhất trong Pinecone.

---

## Cách Sử Dụng

### 1. Khởi Tạo Hệ Thống RAG
```python
rag_system = RAGSystem(pinecone_api_key="your-api-key", index_name="your-index-name")
```

### 2. Tải Tài Liệu
```python
uploaded_files = [file1, file2]  # Danh sách các tệp được tải lên
rag_system.load_documents(uploaded_files)
```

### 3. Tạo Cơ Sở Dữ Liệu Vector
```python
documents = rag_system.load_documents(uploaded_files)
rag_system.create_vector_db(documents)
```

### 4. Truy Xuất Thông Tin
```python
query = "Luật lao động Việt Nam"
results = rag_system.retrieve(query, k=3)
for result in results:
    print(result.page_content)
```

---

## Ghi Chú
- **Pinecone API Key**: Đảm bảo cung cấp API Key hợp lệ để kết nối đến Pinecone.
- **Index Name**: Tên index phải duy nhất và được cấu hình đúng trong Pinecone.
- **Tài Liệu**: Chỉ hỗ trợ định dạng PDF và TXT.

---

## Tệp Liên Quan
- **`app.py`**: Tích hợp `RAGSystem` để xử lý tài liệu và truy vấn.
- **`chatbot.py`**: Sử dụng `RAGSystem` để cung cấp ngữ cảnh cho chatbot.