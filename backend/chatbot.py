import google.generativeai as genai
import os
import json


class GeminiBot:
    def __init__(self, api_key):
        self.api_key = api_key
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    def generate_response(self, query, context_chunks, is_contract):
        """
        Generate a response using Gemini based on the query and retrieved context.
        """

        if is_contract:
            context_text = context_chunks
            system_prompt = f"""Bạn là một trợ lý tư vấn pháp luật thông minh và chuyên nghiệp.
            Dựa vào thông tin hợp đồng người dùng mong muốn, bạn hãy phân tích và điền các thông tin cần thiết vào ngữ cảnh hợp đồng được cung cấp.
            Câu trả lời là một JSON object với các key là từng tên biến trong ngữ cảnh và value là các giá trị suy ra từ thông tin của người dùng, nếu không có giá trị phù hợp thì để trống chuỗi "".

            Ngữ cảnh:
            {context_text}
            
            Câu hỏi: {query}
            
            Trả lời:"""
        else:
            context_text = "\n\n".join([doc.text for doc in context_chunks])
            system_prompt = f"""Bạn là một trợ lý tư vấn pháp luật thông minh và chuyên nghiệp.
            Hãy dựa vào câu hỏi người dùng và các thông tin ngữ cảnh được cung cấp để đưa ra câu trả lời chính xác và hữu ích nhất.
            Câu trả lời bạn đưa ra phải chuyên nghiệp, không được máy móc, cảm xúc và thân thiện với người dùng, theo phong cách của một luật sư tư vấn pháp luật chuyên nghiệp tại Việt Nam.
            Khi trích dẫn thông tin từ tài liệu, hãy cung cấp tên luật, nghị quyết, điều mấy,... và kèm theo thời gian ban hành và hiệu lực
            Nếu câu hỏi không liên quan đến pháp luật, hãy lịch sự từ chối trả lời.

            Ngữ cảnh:
            {context_text}
            
            Câu hỏi: {query}
            
            Trả lời:"""

        try:
            response = self.model.generate_content(system_prompt)

            # Ghi log nội dung của response.text
            print("Raw response from Gemini API:", response.text)

            # Nếu is_contract, kiểm tra xem response có phải JSON không
            if is_contract:
                if not response.text.strip():
                    raise ValueError("Response from Gemini API is empty.")
                try:
                    response_json = json.loads(response.text)  # Chuyển đổi từ chuỗi JSON
                    return json.dumps(response_json, ensure_ascii=False)  # Trả về JSON string
                except json.JSONDecodeError as e:
                    raise ValueError(f"Failed to parse response as JSON: {str(e)}")

            # Nếu không phải hợp đồng, trả về văn bản
            return response.text
        except Exception as e:
            return json.dumps({"is_contract": is_contract, "response": f"Xin lỗi, đã xảy ra lỗi khi gọi API Gemini: {str(e)}"}, ensure_ascii=False)