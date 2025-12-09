import google.generativeai as genai
import os
import json


class GeminiBot:
    def __init__(self, api_key):
        self.api_key = api_key
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    def generate_response(self, query, context_chunks):
        """
        Generate a response using Gemini based on the query and retrieved context.
        """
        # Ghi log cấu trúc của context_chunks

        # Sử dụng thuộc tính page_content thay vì text
        context_text = "\n\n".join([doc.page_content for doc in context_chunks if hasattr(doc, 'page_content')])
        system_prompt = f"""Bạn là một trợ lý tư vấn pháp luật thông minh và chuyên nghiệp.
        Hãy dựa vào câu hỏi người dùng và các thông tin ngữ cảnh được cung cấp để đưa ra câu trả lời chính xác và hữu ích nhất, luôn hiển thị các thông tin mới nhất trong ngữ cảnh để người dùng nắm bắt ngay lập tức.
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
            # print("Raw response from Gemini API:", response.text)

            # Nếu is_contract, kiểm tra xem response có phải JSON không
            # if is_contract:
            #     if not response.text.strip():
            #         raise ValueError("Response from Gemini API is empty.")
            #     try:
            #         response_json = json.loads(response.text)  # Chuyển đổi từ chuỗi JSON
            #         return json.dumps(response_json, ensure_ascii=False)  # Trả về JSON string
            #     except json.JSONDecodeError as e:
            #         raise ValueError(f"Failed to parse response as JSON: {str(e)}")

            # Nếu không phải hợp đồng, trả về văn bản
            return response.text
        except Exception as e:
            return json.dumps({"response": f"Xin lỗi, đã xảy ra lỗi khi gọi API Gemini: {str(e)}"}, ensure_ascii=False)
        
    def generate_response_contract(self, query, variables, messages=[], contentTemplate=""):
        system_prompt = f"""
        Bạn là trợ lý pháp luật AI. Hãy điền các biến hợp đồng dựa trên thông tin người dùng cung cấp.
        Bạn có thể xem lại các tin nhắn trước đó để hiểu ngữ cảnh.
        {messages}
        Bạn có thể tham khảo mẫu hợp đồng sau để biết các biến cần điền:
        {contentTemplate}
        LUÔN trả về JSON ĐÚNG CÚ PHÁP theo mẫu dưới đây (không thêm chữ, không giải thích):

        {{
            "response": "...",
            "variables": {{
                "key": "value",
                ...
            }},
            "status": "incomplete"
        }}

        Không giải thích, không mô tả, không thêm code block.
        Trong đó:
        - "response": Hỏi người dùng những thông tin còn thiếu để điền hợp đồng.
        - "variables": là object chứa toàn bộ biến, biến nào người dùng vừa cung cấp thì cập nhật giá trị, biến chưa biết giữ nguyên (giá trị tên riêng phải viết hoa chữ cái đầu, còn lại viết thường, tên chức vụ viết hoa chữ cái đầu).

        CHỈ TRẢ VỀ JSON THUẦN KHÔNG GIẢI THÍCH.
        Nếu tất cả biến đã có giá trị, hãy trả về:
        {{
            "response": "Tải mẫu về.",
            "variables": {{
                ...toàn bộ biến với giá trị đã điền...
            }},
            "status": "complete"
        }}
        Lưu ý nếu người dùng kêu để trống thì cứ để trống giá trị biến đó (xem nội dung messages để hiểu rõ hơn yêu cầu người dùng).
        Nếu người dùng hỏi cần những thông tin gì để điền hợp đồng, hãy tổng hợp thông tin cần điền thành một đoạn dễ hiểu trong trường "response".
        Dữ liệu hiện có:
        {json.dumps(variables, ensure_ascii=False)}

        Câu hỏi của người dùng:
        {query}

        Trả lời JSON:
        """

        try:
            response = self.model.generate_content(system_prompt)
            return response.text.strip()

        except Exception as e:
            return json.dumps({
                "response": f"Lỗi Gemini: {str(e)}",
                "variables": variables
            }, ensure_ascii=False)