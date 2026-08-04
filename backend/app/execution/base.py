from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel

class ExecutionResult(BaseModel):
    success: bool
    output: Optional[Any] = None
    stdout: str = ""
    stderr: str = ""
    execution_time_ms: float = 0.0
    memory_used_mb: float = 0.0
    error: Optional[str] = None

class BaseExecutionSandbox(ABC):
    """Abstract base class for all secure execution environments (Python, SQL)."""

    @abstractmethod
    def execute(self, code_or_query: str, context: Dict[str, Any], timeout_seconds: int = 30) -> ExecutionResult:
        """Executes code/query inside an isolated sandbox with resource constraints."""
        pass
