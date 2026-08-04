"""
Local AI Engine Package for A3 Analytics Enterprise.
Supports local models (Ollama: Qwen, Llama, DeepSeek, Mistral, Phi) and fallbacks.
"""
from app.ai.factory import AILocalProviderFactory

__all__ = ["AILocalProviderFactory"]
