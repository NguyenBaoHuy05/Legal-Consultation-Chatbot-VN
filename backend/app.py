import streamlit as st
import os
from rag_engine import RAGSystem
from chatbot import GeminiBot

# Page configuration
st.set_page_config(page_title="Trợ Lý Pháp Luật AI (Pinecone)", page_icon="⚖️", layout="wide")

# Custom CSS for styling
st.markdown("""
<style>
    .main {
        background-color: #f0f2f6;
    }
    .stChatInput {
        position: fixed;
        bottom: 3rem;
    }
    .chat-message {
        padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1rem; display: flex
    }
    .chat-message.user {
        background-color: #2b313e; color: #ffffff;
    }
    .chat-message.bot {
        background-color: #ffffff; color: #000000;
    }
</style>
""", unsafe_allow_html=True)

# Initialize Session State
if "messages" not in st.session_state:
    st.session_state.messages = []
if "rag_system" not in st.session_state:
    st.session_state.rag_system = None
if "vector_db_ready" not in st.session_state:
    st.session_state.vector_db_ready = False

# Sidebar
with st.sidebar:
    st.title("⚖️ Cấu Hình")
    
    st.subheader("Cấu hình API")
    gemini_api_key = st.text_input("Gemini API Key", type="password")
    pinecone_api_key = st.text_input("Pinecone API Key", type="password")
    pinecone_index_name = st.text_input("Pinecone Index Name", value="legal-chatbot")
    
    if st.button("Kết Nối Database"):
        if pinecone_api_key and pinecone_index_name:
            st.session_state.rag_system = RAGSystem(pinecone_api_key, pinecone_index_name)
            with st.spinner("Đang kết nối đến Pinecone..."):
                if st.session_state.rag_system.load_index():
                    st.session_state.vector_db_ready = True
                    st.toast("Đã kết nối thành công đến Pinecone!", icon="✅")
                else:
                    st.session_state.vector_db_ready = False
                    st.toast("Chưa tìm thấy index hoặc index rỗng. Vui lòng tải lên tài liệu.", icon="⚠️")
        else:
            st.warning("Vui lòng nhập đầy đủ thông tin Pinecone.")

    st.subheader("Tài Liệu Pháp Luật")
    uploaded_files = st.file_uploader("Tải lên tài liệu (PDF/TXT)", accept_multiple_files=True, type=['pdf', 'txt'])
    
    if st.button("Xử Lý & Upload Tài Liệu"):
        if uploaded_files and pinecone_api_key and pinecone_index_name:
            # Ensure RAG system is initialized
            if st.session_state.rag_system is None:
                st.session_state.rag_system = RAGSystem(pinecone_api_key, pinecone_index_name)
            
            with st.spinner("Đang xử lý và upload lên Pinecone..."):
                documents = st.session_state.rag_system.load_documents(uploaded_files)
                if documents:
                    st.session_state.rag_system.create_vector_db(documents)
                    st.session_state.vector_db_ready = True
                    st.success(f"Đã xử lý và lưu {len(documents)} trang tài liệu vào Pinecone!")
                else:
                    st.error("Không đọc được tài liệu nào.")
        elif not (pinecone_api_key and pinecone_index_name):
            st.warning("Vui lòng nhập API Key và Index Name.")
        else:
            st.warning("Vui lòng tải lên ít nhất một tài liệu.")

    st.markdown("---")
    st.markdown("### Hướng Dẫn")
    st.markdown("1. Nhập API Keys (Gemini & Pinecone).")
    st.markdown("2. Nhấn 'Kết Nối Database' để dùng dữ liệu cũ.")
    st.markdown("3. Hoặc tải tài liệu mới và nhấn 'Xử Lý & Upload'.")
    st.markdown("4. Bắt đầu chat!")

# Main Chat Interface
st.title("Trợ Lý Tư Vấn Pháp Luật Việt Nam 🇻🇳")
st.caption("Sử dụng công nghệ RAG + Gemini + Pinecone")

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat Input
if prompt := st.chat_input("Bạn cần tư vấn về vấn đề gì?"):
    # Add user message to history
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Generate response
    if not gemini_api_key:
        response = "Vui lòng nhập Gemini API Key trong thanh bên trái để bắt đầu."
    elif not st.session_state.vector_db_ready:
        response = "Vui lòng kết nối đến Pinecone hoặc tải lên tài liệu trước."
    else:
        with st.chat_message("assistant"):
            with st.spinner("Đang suy nghĩ..."):
                # Retrieve context
                # Ensure rag_system is initialized if it wasn't (e.g. page refresh but session kept?)
                # Actually session_state persists, so it should be fine.
                if st.session_state.rag_system:
                    context_chunks = st.session_state.rag_system.retrieve(prompt)
                    
                    # Generate answer
                    bot = GeminiBot(gemini_api_key)
                    response = bot.generate_response(prompt, context_chunks)
                    st.markdown(response)
                    
                    # Show sources (optional)
                    with st.expander("Xem nguồn tham khảo"):
                        for i, doc in enumerate(context_chunks):
                            st.markdown(f"**Nguồn {i+1}:**")
                            st.markdown(doc.page_content[:300] + "...")
                else:
                    response = "Lỗi: Hệ thống chưa được khởi tạo. Vui lòng kết nối lại."
                    st.error(response)

    # Add assistant message to history
    st.session_state.messages.append({"role": "assistant", "content": response})
