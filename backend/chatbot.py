import google.generativeai as genai
import os


class GeminiBot:
    def __init__(self, api_key):
        self.api_key = api_key
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    def generate_response(self, query, context_chunks):
        """
        Generate a response using Gemini based on the query and retrieved context.
        """
        context_text = "\n\n".join([doc.page_content for doc in context_chunks])

        system_prompt = f"""Bạn là một trợ lý tư vấn pháp luật thông minh và chuyên nghiệp.
        Hãy sử dụng thông tin ngữ cảnh được cung cấp dưới đây để trả lời câu hỏi của người dùng.
        Nếu thông tin không có trong ngữ cảnh, bạn có quyền tìm kiếm những câu tương đồng, gần giống trên 80%, nếu không hãy nói rằng bạn không tìm thấy thông tin trong tài liệu được cung cấp và không suy đoán thêm.
        Câu trả lời bạn đưa ra phải chuyên nghiệp, không được máy móc, cảm xúc và thân thiện với người dùng, theo phong cách của một luật sư tư vấn pháp luật chuyên nghiệp tại Việt Nam.
        Khi trích dẫn thông tin từ tài liệu, hãy cung cấp tên luật, nghị quyết, điều mấy,... và kèm theo thời gian ban hành và hiệu lực
        Nếu câu hỏi không liên quan đến pháp luật, hãy lịch sự từ chối trả lời.
        
        Ngữ cảnh:
        {context_text}
        
        Câu hỏi: {query}
        
        Trả lời:"""

        try:
            response = self.model.generate_content(system_prompt)
            return response.text
        except Exception as e:
            return f"Xin lỗi, đã xảy ra lỗi khi gọi API Gemini: {str(e)}"
