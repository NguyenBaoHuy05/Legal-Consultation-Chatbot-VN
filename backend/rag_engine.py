import os
import time
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_pinecone import PineconeVectorStore
from langchain_community.embeddings import HuggingFaceEmbeddings
from pinecone import Pinecone, ServerlessSpec

class RAGSystem:
    def __init__(self, pinecone_api_key=None, index_name=None):
        self.embeddings = HuggingFaceEmbeddings(model_name="keepitreal/vietnamese-sbert")
        self.vector_db = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=300,
            separators=["\n\n", "\n", " ", ""]
        )
        self.pinecone_api_key = pinecone_api_key
        if pinecone_api_key:
            os.environ["PINECONE_API_KEY"] = pinecone_api_key
        self.index_name = index_name

    def load_documents(self, files):
        """
        Load documents from a list of uploaded files (Streamlit UploadedFile objects).
        Returns a list of Document objects.
        """
        documents = []
        for file in files:
            file_extension = os.path.splitext(file.name)[1].lower()
            
            # Save temp file to read
            with open(file.name, "wb") as f:
                f.write(file.getbuffer())
            
            try:
                if file_extension == ".pdf":
                    loader = PyPDFLoader(file.name)
                    file_docs = loader.load()
                elif file_extension == ".txt":
                    loader = TextLoader(file.name, encoding="utf-8")
                    file_docs = loader.load()
                else:
                    continue

                # Attach metadata to each document
                for doc in file_docs:
                    print("Adding metadata for document from file:", file.name)
                    # Preserve existing metadata (like page number from PyPDFLoader)
                    # Update source to be just the filename, not the full temp path
                    doc.metadata["source"] = file.name
                    if "page" not in doc.metadata:
                        doc.metadata["page"] = 0 # Default for text files

                documents.extend(file_docs)
            finally:
                # Clean up temp file
                if os.path.exists(file.name):
                    os.remove(file.name)
        
        return documents

    def create_vector_db(self, documents):
        """
        Create (or update) a Pinecone vector database from a list of Documents.
        """
        if not documents or not self.pinecone_api_key or not self.index_name:
            print("Missing documents, API key, or index name.")
            return None

        chunks = self.text_splitter.split_documents(documents)
        # print(f"Chunks: {chunks}")

        # Initialize Pinecone Client to check/create index
        pc = Pinecone(api_key=self.pinecone_api_key)

        existing_indexes = [index_info["name"] for index_info in pc.list_indexes()]
        print(f"Existing indexes: {existing_indexes}")

        if self.index_name not in existing_indexes:
            try:
                pc.create_index(
                    name=self.index_name,
                    dimension=768,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                while not pc.describe_index(self.index_name).status['ready']:
                    time.sleep(1)
            except Exception as e:
                print(f"Error creating index: {e}")
                return None

        try:
            self.vector_db = PineconeVectorStore.from_documents(
                documents=chunks,
                embedding=self.embeddings, 
                index_name=self.index_name,
            )
            print("Vector database created successfully.")
            return self.vector_db
        except Exception as e:
            print(f"Error creating vector database: {e}")
            return None

    def retrieve(self, query, k=20):
        """
        Retrieve the top k most relevant document chunks for a query.
        """
        if self.vector_db is None:
            # Try to connect if not already connected
            if not self.load_index():
                return []
        
        return self.vector_db.similarity_search(query, k=k)

    def save_index(self, folder_path=None):
        """
        Pinecone saves automatically to the cloud. This is a placeholder.
        """
        return True

    def load_index(self, folder_path=None):
        """
        Connect to the existing Pinecone index.
        """
        if not self.pinecone_api_key or not self.index_name:
            return False
            
        try:
            self.vector_db = PineconeVectorStore.from_existing_index(
                index_name=self.index_name,
                embedding=self.embeddings
            )
            return True
        except Exception as e:
            print(f"Error loading index: {e}")
            return False
    def deleteAll(self):
        """
        Delete all vectors in the Pinecone index.
        """
        if self.vector_db is None:
            if not self.load_index():
                return False
        try:
            self.vector_db.delete(delete_all=True)
            return True
        except Exception as e:
            print(f"Error deleting vectors: {e}")
            return False
    def deleteSource(self, source: str):
        """
        Delete specific vectors by source in the Pinecone index.
        """
        if self.vector_db is None:
            if not self.load_index():
                return False
        try:
            print(f"Attempting to delete vectors with source: {source}")
            
            self.vector_db.index.delete(filter={"source": source})
            
            print(f"Successfully deleted vectors with source: {source}")
            return True
        except Exception as e:
            print(f"Error deleting vectors: {e}")
            return False
