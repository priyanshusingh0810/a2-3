import logging
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("a3.ai.factory")

SUPPORTED_LOCAL_MODELS = [
    "qwen2.5:latest",
    "qwen2.5-coder",
    "llama3:latest",
    "deepseek-r1:latest",
    "deepseek-coder",
    "mistral:latest",
    "phi3:latest",
]

class AILocalProviderFactory:
    """
    Local-First AI Model Factory.
    Ensures all prompt queries remain 100% on the local machine via Ollama or local inference engine.
    """

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.OLLAMA_BASE_URL

    async def list_available_models(self) -> List[Dict[str, Any]]:
        """Lists models currently installed locally in Ollama."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = data.get("models", [])
                    return [
                        {
                            "name": m.get("name"),
                            "size": m.get("size"),
                            "digest": m.get("digest")[:12] if m.get("digest") else "",
                            "modified_at": m.get("modified_at")
                        }
                        for m in models
                    ]
        except Exception as e:
            logger.warning(f"Could not reach local Ollama endpoint: {e}")
        
        # Default local fallback models list
        return [{"name": m, "size": "Local", "digest": "local"} for m in SUPPORTED_LOCAL_MODELS]

    async def verify_model_installed(self, model_name: str) -> bool:
        """Verifies if the requested model is available locally."""
        available = await self.list_available_models()
        model_names = [m["name"].split(":")[0] for m in available] + [m["name"] for m in available]
        target = model_name.split(":")[0]
        return target in model_names

    def get_supported_models(self) -> List[str]:
        return SUPPORTED_LOCAL_MODELS
