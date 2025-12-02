# Đặc Tả File `auth.py`

## Tổng Quan
File `auth.py` chịu trách nhiệm xử lý các chức năng liên quan đến xác thực và phân quyền người dùng trong ứng dụng. Nó sử dụng các công nghệ như JWT (JSON Web Token) để quản lý phiên đăng nhập và mã hóa mật khẩu an toàn với thư viện `passlib`.

---

## Chức Năng Chính

### 1. Xác Thực Người Dùng
- **`get_current_user`**:
  - Giải mã JWT để lấy thông tin người dùng hiện tại.
  - Kiểm tra tính hợp lệ của token.
- **`get_current_active_user`**:
  - Kiểm tra trạng thái hoạt động của người dùng (không bị vô hiệu hóa).
- **`get_current_admin_user`**:
  - Kiểm tra quyền hạn của người dùng (phải là admin).

### 2. Quản Lý Mật Khẩu
- **`verify_password`**:
  - Xác minh mật khẩu người dùng bằng cách so sánh với mật khẩu đã mã hóa.
- **`get_password_hash`**:
  - Mã hóa mật khẩu người dùng bằng thuật toán Argon2.

### 3. Tạo Token
- **`create_access_token`**:
  - Tạo JWT với thông tin người dùng và thời gian hết hạn.

### 4. Truy Xuất Người Dùng
- **`get_user`**:
  - Truy xuất thông tin người dùng từ cơ sở dữ liệu MongoDB.

---

## Các Thành Phần Chính

### 1. **Cấu Hình**
- **`SECRET_KEY`**: Khóa bí mật để mã hóa và giải mã JWT.
- **`ALGORITHM`**: Thuật toán mã hóa JWT (HS256).
- **`ACCESS_TOKEN_EXPIRE_MINUTES`**: Thời gian hết hạn của token (30 phút).

### 2. **Thư Viện Sử Dụng**
- **`fastapi`**: Xử lý các yêu cầu HTTP và phụ thuộc.
- **`jose`**: Mã hóa và giải mã JWT.
- **`passlib`**: Mã hóa mật khẩu an toàn.
- **`motor`**: Kết nối cơ sở dữ liệu MongoDB.

### 3. **Mô Hình Dữ Liệu**
- **`TokenData`**: Chứa thông tin cơ bản của token (username).
- **`User`**: Mô hình người dùng (bao gồm username, role, trạng thái hoạt động).
- **`UserInDB`**: Mô hình người dùng trong cơ sở dữ liệu.

---

## Quy Trình Hoạt Động

1. **Đăng Nhập**:
   - Người dùng gửi yêu cầu đăng nhập với tên đăng nhập và mật khẩu.
   - Hệ thống kiểm tra thông tin đăng nhập và tạo JWT nếu hợp lệ.
2. **Xác Thực**:
   - Mỗi yêu cầu từ người dùng đều kèm theo JWT.
   - Hệ thống giải mã JWT để xác định người dùng và kiểm tra quyền hạn.
3. **Phân Quyền**:
   - Kiểm tra trạng thái hoạt động của người dùng.
   - Kiểm tra quyền hạn (admin hoặc người dùng thông thường).

---

## Cách Sử Dụng

### 1. Tạo Token
```python
from datetime import timedelta

data = {"sub": "username"}
access_token = create_access_token(data, expires_delta=timedelta(minutes=30))
print(access_token)
```

### 2. Xác Minh Mật Khẩu
```python
hashed_password = get_password_hash("my_password")
print(verify_password("my_password", hashed_password))  # True
```

### 3. Tích Hợp Với FastAPI
```python
from fastapi import FastAPI, Depends

app = FastAPI()

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user
```

---

## Ghi Chú
- **Bảo mật**: Đảm bảo thay đổi `SECRET_KEY` khi triển khai thực tế.
- **Cơ sở dữ liệu**: Cần cấu hình kết nối MongoDB trong `main.py`.
- **Thời gian hết hạn**: Có thể điều chỉnh `ACCESS_TOKEN_EXPIRE_MINUTES` theo yêu cầu.

---

## Tệp Liên Quan
- **`models.py`**: Định nghĩa các mô hình dữ liệu.
- **`main.py`**: Cấu hình cơ sở dữ liệu và tích hợp các phụ thuộc.