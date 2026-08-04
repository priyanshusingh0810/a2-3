from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import uuid
import datetime

class NotebookCell(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cell_type: str  # "markdown", "python", "sql", "chart", "table"
    code: str
    output: Optional[Any] = None
    execution_count: Optional[int] = None
    status: str = "idle"  # "idle", "running", "completed", "error"
    execution_time_ms: float = 0.0

class NotebookState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "Untitled Notebook"
    dataset_id: Optional[str] = None
    cells: List[NotebookCell] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat())

class NotebookManager:
    """Manages notebook CRUD operations and cell state execution."""

    def __init__(self):
        self._notebooks: Dict[str, NotebookState] = {}

    def create_notebook(self, title: str, dataset_id: Optional[str] = None) -> NotebookState:
        nb = NotebookState(title=title, dataset_id=dataset_id)
        # Add default introductory markdown cell
        nb.cells.append(NotebookCell(
            cell_type="markdown",
            code=f"# {title}\n*Created in A3 Analytics Enterprise local notebook.*"
        ))
        self._notebooks[nb.id] = nb
        return nb

    def get_notebook(self, notebook_id: str) -> Optional[NotebookState]:
        return self._notebooks.get(notebook_id)

    def add_cell(self, notebook_id: str, cell_type: str, code: str = "") -> Optional[NotebookCell]:
        nb = self.get_notebook(notebook_id)
        if not nb:
            return None
        cell = NotebookCell(cell_type=cell_type, code=code)
        nb.cells.append(cell)
        nb.updated_at = datetime.datetime.utcnow().isoformat()
        return cell

    def update_cell_output(self, notebook_id: str, cell_id: str, output: Any, status: str = "completed", execution_time_ms: float = 0.0) -> bool:
        nb = self.get_notebook(notebook_id)
        if not nb:
            return False
        for cell in nb.cells:
            if cell.id == cell_id:
                cell.output = output
                cell.status = status
                cell.execution_time_ms = execution_time_ms
                nb.updated_at = datetime.datetime.utcnow().isoformat()
                return True
        return False
