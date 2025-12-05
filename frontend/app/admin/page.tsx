"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface FileRecord {
  filename: string;
  size: number;
  upload_date: string;
  uploaded_by: string;
  status: string;
}

const API_URL = process.env.API_URL || "http://localhost:8000";

export default function AdminDashboard() {
  const [pineconeKey, setPineconeKey] = useState("");
  const [pineconeIndex, setPineconeIndex] = useState("legal-chatbot");
  const [status, setStatus] = useState("");
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [constractFiles, setConstractFiles] = useState<File[]>([]);
  const [dbFiles, setDbFiles] = useState<FileRecord[]>([]);

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
        console.log("Files from DB:", response.data);
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

  const handleDeleteFileFromDb = async (fileName: string) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/admin/delete-file/${fileName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDbFiles((prevFiles) =>
        prevFiles.filter((file) => file.filename !== fileName)
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

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const handleConstractSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setConstractFiles(Array.from(e.target.files));
    }
  };

  const handleDeleteFile = (index: number) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleDeleteConstractFile = (index: number) => {
    setConstractFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleSendToPinecone = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Không có file nào để gửi đến Pinecone.");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    for (let file of uploadedFiles) {
      const isDuplicate = dbFiles.some(
        (dbFile) => dbFile.filename === file.name
      );
      if (isDuplicate) {
        toast.error(`File ${file.name} already exists in the database.`);
        return;
      }
      formData.append("files", file);
    }

    setStatus("Đang gửi file đến Pinecone...");
    // console.log("Uploading files:", formData.getAll("files"));
    // return
    try {
      await axios.post(`${API_URL}/admin/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      setStatus("Gửi file đến Pinecone thành công!");
      setUploadedFiles([]); // Clear uploaded files after sending
      setDbFiles((prevDbFiles) => [
        ...prevDbFiles,
        ...uploadedFiles.map((file) => ({
          filename: file.name,
          size: file.size,
          upload_date: new Date().toISOString(),
          uploaded_by: "admin",
          status: "processed",
        })),
      ]);
      toast.success("Files sent to Pinecone successfully.");
    } catch (error) {
      setStatus("Lỗi khi gửi file đến Pinecone!");
    }
    // try {
    //   for (const file of uploadedFiles) {
    //     const response = await axios.post(
    //       `${API_URL}/admin/create-file`,
    //       {
    //         filename: file.name,
    //         size: file.size,
    //         upload_date: new Date().toISOString(),
    //         uploaded_by: "admin",
    //         status: "processed",
    //       }, // Gửi từng file
    //       { headers: { Authorization: `Bearer ${token}` } }
    //     );
    //     console.log(`File ${file.name} created successfully:`, response.data);
    //     setDbFiles((prevDbFiles) => [...prevDbFiles, response.data]);
    //   }
    // } catch (error) {
    //   console.error("Failed to create file record:", error);
    // }
  };

  const handleSendToSupabase = async () => {
    if (constractFiles.length === 0) {
      toast.error("Không có file nào để gửi đến Supabase.");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    for (let file of constractFiles) {
      formData.append("files", file);
    }
    setStatus("Đang gửi file đến Supabase...");
    // console.log("Uploading files:", formData.getAll("files"));
    // return
    try {
      await axios.post(`${API_URL}/admin/upload-supabase`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      setStatus("Gửi file đến Pinecone thành công!");
      setUploadedFiles([]); // Clear uploaded files after sending
      setDbFiles((prevDbFiles) => [
        ...prevDbFiles,
        ...uploadedFiles.map((file) => ({
          filename: file.name,
          size: file.size,
          upload_date: new Date().toISOString(),
          uploaded_by: "admin",
          status: "processed",
        })),
      ]);
      toast.success("Files sent to Pinecone successfully.");
    } catch (error) {
      setStatus("Lỗi khi gửi file đến Pinecone!");
    }
  };

  return (
    <div className="p-8 min-h-screen  overflow-y-auto">
      <ToastContainer />
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <button
        onClick={() => {
          localStorage.removeItem("token");
          router.push("/login");
        }}
        className="float-right ml-5 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Logout
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="mt-8 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <h2>Cấu Hình Hệ Thống (Pinecone)</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Pinecone API Key
            </label>
            <input
              type="password"
              value={pineconeKey}
              onChange={(e) => setPineconeKey(e.target.value)}
              className="w-full p-2 mt-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Index Name
            </label>
            <input
              type="text"
              value={pineconeIndex}
              onChange={(e) => setPineconeIndex(e.target.value)}
              className="w-full p-2 mt-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleConfig}
            className="px-5 py-2.5 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Lưu Cấu Hình
          </button>
        </div>

        <div className="mt-8 p-4 border border-gray-200 rounded-lg bg-white shadow-sm max-h-[calc(100vh-200px)] overflow-y-auto">
          <h2>Quản Lý Tài Liệu</h2>
          <input
            type="file"
            multiple
            accept=".pdf,.txt"
            onChange={handleFileSelection}
            className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <br />
          <button
            onClick={handleSendToPinecone}
            className="px-5 py-2.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Send PineCone
          </button>

          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <h3>Danh sách file đã tải lên:</h3>
              <ul>
                {uploadedFiles.map((file, index) => (
                  <div
                    className="flex flex-row items-center mb-1.5 justify-between bg-gray-50 p-2 rounded"
                    key={index}
                  >
                    <li key={index}>{file.name}</li>
                    <div
                      onClick={() => handleDeleteFile(index)}
                      className="bg-red-700 px-2.5 py-1.5 rounded text-white cursor-pointer ml-2.5 hover:bg-red-800 transition-colors text-sm"
                    >
                      Xóa
                    </div>
                  </div>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm max-h-[calc(100vh-200px)] overflow-y-auto">
          <h2>Úp hợp đồng</h2>
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.docx"
            onChange={handleConstractSelection}
            className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <br />
          <button
            onClick={handleSendToSupabase}
            className="px-5 py-2.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Send Supabase
          </button>

          {constractFiles.length > 0 && (
            <div className="mt-4">
              <h3>Danh sách file đã tải lên:</h3>
              <ul>
                {constractFiles.map((file, index) => (
                  <div
                    className="flex flex-row items-center mb-1.5 justify-between bg-gray-50 p-2 rounded"
                    key={index}
                  >
                    <li key={index}>{file.name}</li>
                    <div
                      onClick={() => handleDeleteConstractFile(index)}
                      className="bg-red-700 px-2.5 py-1.5 rounded text-white cursor-pointer ml-2.5 hover:bg-red-800 transition-colors text-sm"
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
      <div className="mt-8 p-4 border border-gray-200 rounded-lg bg-white shadow-sm h-[calc(100vh-200px)">
        <h2>Danh sách file đã upload</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2.5 font-semibold text-gray-700">Tên file</th>
              <th className="p-2.5 font-semibold text-gray-700">Ngày upload</th>
              <th className="p-2.5 font-semibold text-gray-700">Dung lượng</th>
              <th className="p-2.5 font-semibold text-gray-700">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {dbFiles.map((file) => (
              <tr
                key={file.filename}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="p-2.5">{file.filename}</td>
                <td className="p-2.5">
                  {new Date(file.upload_date).toLocaleDateString("vi-VN")}
                </td>
                <td className="p-2.5">{(file.size / 1024).toFixed(2)} KB</td>
                <td className="p-2.5">
                  <button
                    onClick={() => handleDeleteFileFromDb(file.filename)}
                    className="px-2.5 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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
          className="mt-4 px-5 py-2.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Xóa tất cả
        </button>
      </div>
      <div className="mt-8 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
        <h2>Quản Lý Người Dùng</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2.5 font-semibold text-gray-700">Username</th>
              <th className="p-2.5 font-semibold text-gray-700">Full Name</th>
              <th className="p-2.5 font-semibold text-gray-700">Email</th>
              <th className="p-2.5 font-semibold text-gray-700">Role</th>
              <th className="p-2.5 font-semibold text-gray-700">Status</th>
              <th className="p-2.5 font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.username}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="p-2.5">{user.username}</td>
                <td className="p-2.5">{user.full_name}</td>
                <td className="p-2.5">{user.email}</td>
                <td className="p-2.5">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      user.role === "admin"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="p-2.5">
                  <span
                    className={`font-bold ${
                      user.disabled ? "text-red-500" : "text-green-500"
                    }`}
                  >
                    {user.disabled ? "Disabled" : "Active"}
                  </span>
                </td>
                <td className="p-2.5">
                  {user.role !== "admin" && (
                    <button
                      onClick={() =>
                        toggleUserStatus(user.username, user.disabled)
                      }
                      className={`px-2.5 py-1.5 text-white rounded cursor-pointer border-none ${
                        user.disabled
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
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

      {status && (
        <div className="mt-4 p-4 bg-gray-200 rounded text-center">{status}</div>
      )}
    </div>
  );
}
