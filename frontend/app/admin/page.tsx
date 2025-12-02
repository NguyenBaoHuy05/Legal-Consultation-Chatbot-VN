"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = "http://localhost:8000";

interface DbFile {
  _id: string;
  filename: string;
  upload_date: string;
  size: number;
}

export default function AdminDashboard() {
  const [pineconeKey, setPineconeKey] = useState("");
  const [pineconeIndex, setPineconeIndex] = useState("legal-chatbot");
  const [files, setFiles] = useState<File[] | null>(null);
  const [status, setStatus] = useState("");
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dbFiles, setDbFiles] = useState<DbFile[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    // Verify admin and fetch users
    axios
      .get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.role !== "admin") {
          router.push("/");
        } else {
          fetchUsers(token);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const fetchUsers = async (token: string) => {
    try {
      const res = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to fetch users");
    }
  };

  useEffect(() => {
    const fetchDbFiles = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(`${API_URL}/admin/list-file`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDbFiles(response.data);
      } catch (error) {
        console.error("Failed to fetch files from database.", error);
      }
    };

    fetchDbFiles();
  }, []);

  const toggleUserStatus = async (username: string, currentStatus: boolean) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `${API_URL}/admin/users/${username}/status`,
        {
          disabled: !currentStatus,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchUsers(token!); // Refresh list
      setStatus(`Đã cập nhật trạng thái cho user ${username}`);
    } catch (error: any) {
      setStatus(error.response?.data?.detail || "Lỗi cập nhật trạng thái!");
    }
  };

  const handleConfig = async () => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_URL}/admin/config`,
        {
          pinecone_api_key: pineconeKey,
          pinecone_index_name: pineconeIndex,
          gemini_api_key: "unused_by_admin_config",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStatus("Cấu hình thành công!");
    } catch (error) {
      setStatus("Lỗi cấu hình!");
    }
  };

  const handleDeleteFileFromDb = async (fileId: string) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/admin/delete-file/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDbFiles((prevFiles) =>
        prevFiles.filter((file) => file._id !== fileId)
      );
      toast.success("File deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete file.");
    }
  };

  const handleDeleteAllFiles = async () => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/admin/deleteAll`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDbFiles([]);
      toast.success("All files deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete all files.");
    }
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("No files selected.");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    for (let file of selectedFiles) {
      const isDuplicate = dbFiles.some(
        (dbFile) => dbFile.filename === file.name
      );
      if (isDuplicate) {
        toast.error(`File ${file.name} already exists in the database.`);
        return;
      }
      formData.append("files", file);
    }

    try {
      await axios.post(`${API_URL}/admin/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("Files uploaded successfully.");
      // Refresh file list
      const response = await axios.get(`${API_URL}/admin/list-file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDbFiles(response.data);
    } catch (error) {
      toast.error("Failed to upload files.");
    }
  };

  const handleDeleteFile = (index: number) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleSendToPinecone = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Không có file nào để gửi đến Pinecone.");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    uploadedFiles.forEach((file) => {
      formData.append("files", file);
    });

    setStatus("Đang gửi file đến Pinecone...");
    try {
      await axios.post(`${API_URL}/admin/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      setStatus("Gửi file đến Pinecone thành công!");
      setUploadedFiles([]); // Clear uploaded files after sending
    } catch (error) {
      setStatus("Lỗi khi gửi file đến Pinecone!");
    }
  };

  return (
    <div style={{ padding: "2rem", minHeight: "100vh" }}>
      <ToastContainer />
      <h1>Admin Dashboard 🛠️</h1>
      <button
        onClick={() => {
          localStorage.removeItem("token");
          router.push("/login");
        }}
        style={{ float: "right", padding: "5px 10px" }}
      >
        Logout
      </button>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}
      >
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "white",
          }}
        >
          <h2>Cấu Hình Hệ Thống (Pinecone)</h2>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block" }}>Pinecone API Key</label>
            <input
              type="password"
              value={pineconeKey}
              onChange={(e) => setPineconeKey(e.target.value)}
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block" }}>Index Name</label>
            <input
              type="text"
              value={pineconeIndex}
              onChange={(e) => setPineconeIndex(e.target.value)}
              style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            />
          </div>
          <button
            onClick={handleConfig}
            style={{
              padding: "10px 20px",
              background: "#333",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Lưu Cấu Hình
          </button>
        </div>

        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "white",
          }}
        >
          <h2>Quản Lý Tài Liệu</h2>
          <input
            type="file"
            multiple
            accept=".pdf,.txt"
            onChange={handleUploadFiles}
            style={{ marginBottom: "1rem" }}
          />
          <br />
          <button
            onClick={() => {
              if (uploadedFiles.length === 0) {
                toast.error("Vui lòng chọn ít nhất một file để upload.");
                return;
              }
              setFiles(uploadedFiles);
              toast.success(
                "File đã được tải lên thành công. Vui lòng kiểm tra danh sách file."
              );
            }}
            style={{
              padding: "10px 20px",
              background: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              marginRight: "10px",
            }}
          >
            Upload
          </button>
          <button
            onClick={handleSendToPinecone}
            style={{
              padding: "10px 20px",
              background: "#2196f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Send PineCone
          </button>

          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Danh sách file đã tải lên:</h3>
              <ul>
                {uploadedFiles.map((file, index) => (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: "5px",
                      justifyContent: "space-between",
                    }}
                    key={index}
                  >
                    <li key={index}>{file.name}</li>
                    <div
                      onClick={() => handleDeleteFile(index)}
                      style={{
                        background: "#bb4242ff",
                        padding: "5px 10px",
                        borderRadius: "4px",
                        color: "white",
                        cursor: "pointer",
                        marginLeft: "10px",
                      }}
                    >
                      Xóa
                    </div>
                  </div>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          background: "white",
        }}
      >
        <h2>Quản Lý Người Dùng</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f4f4f4", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>Username</th>
              <th style={{ padding: "10px" }}>Full Name</th>
              <th style={{ padding: "10px" }}>Email</th>
              <th style={{ padding: "10px" }}>Role</th>
              <th style={{ padding: "10px" }}>Status</th>
              <th style={{ padding: "10px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.username}
                style={{ borderBottom: "1px solid #eee" }}
              >
                <td style={{ padding: "10px" }}>{user.username}</td>
                <td style={{ padding: "10px" }}>{user.full_name}</td>
                <td style={{ padding: "10px" }}>{user.email}</td>
                <td style={{ padding: "10px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: user.role === "admin" ? "#e3f2fd" : "#f5f5f5",
                      color: user.role === "admin" ? "#1976d2" : "#616161",
                      fontSize: "0.9em",
                    }}
                  >
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: "10px" }}>
                  <span
                    style={{
                      color: user.disabled ? "red" : "green",
                      fontWeight: "bold",
                    }}
                  >
                    {user.disabled ? "Disabled" : "Active"}
                  </span>
                </td>
                <td style={{ padding: "10px" }}>
                  {user.role !== "admin" && (
                    <button
                      onClick={() =>
                        toggleUserStatus(user.username, user.disabled)
                      }
                      style={{
                        padding: "5px 10px",
                        background: user.disabled ? "#4caf50" : "#f44336",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      {user.disabled ? "Enable" : "Disable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          background: "white",
        }}
      >
        <h2>Danh sách file đã upload</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f4f4f4", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>Tên file</th>
              <th style={{ padding: "10px" }}>Ngày upload</th>
              <th style={{ padding: "10px" }}>Dung lượng</th>
              <th style={{ padding: "10px" }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {dbFiles.map((file) => (
              <tr key={file._id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px" }}>{file.filename}</td>
                <td style={{ padding: "10px" }}>
                  {new Date(file.upload_date).toLocaleDateString("vi-VN")}
                </td>
                <td style={{ padding: "10px" }}>
                  {(file.size / 1024).toFixed(2)} KB
                </td>
                <td style={{ padding: "10px" }}>
                  <button
                    onClick={() => handleDeleteFileFromDb(file._id)}
                    style={{
                      padding: "5px 10px",
                      background: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={handleDeleteAllFiles}
          style={{
            marginTop: "1rem",
            padding: "10px 20px",
            background: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Xóa tất cả
        </button>
      </div>

      {status && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#eee",
            borderRadius: "4px",
            textAlign: "center",
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}