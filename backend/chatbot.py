import google.generativeai as genai
import os

class GeminiBot:
    def __init__(self, api_key):
        self.api_key = api_key
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def generate_response(self, query, context_chunks):
        """
        Generate a response using Gemini based on the query and retrieved context.
        """
        context_text = "\n\n".join([doc.page_content for doc in context_chunks])
        
        system_prompt = f"""Bạn là một trợ lý tư vấn pháp luật thông minh và hữu ích.
        Hãy sử dụng thông tin ngữ cảnh được cung cấp dưới đây để trả lời câu hỏi của người dùng.
        Nếu thông tin không có trong ngữ cảnh, hãy nói rằng bạn không tìm thấy thông tin trong tài liệu được cung cấp và không suy đoán thêm.
        
        Ngữ cảnh:
        {context_text}
        
        Câu hỏi: {query}
        
        Trả lời:"""
        
        try:
            response = self.model.generate_content(system_prompt)
            return response.text
        except Exception as e:
            return f"Xin lỗi, đã xảy ra lỗi khi gọi API Gemini: {str(e)}"
