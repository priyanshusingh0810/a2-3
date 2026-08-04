import logging
from typing import Dict, Any
from app.notebooks.manager import NotebookState, NotebookCell
from app.execution.python_sandbox import SecurePythonSandbox
from app.execution.sql_sandbox import SecureSQLSandbox

logger = logging.getLogger("a3.notebooks.runner")

class NotebookCellRunner:
    """
    Executes notebook cells safely using sandboxed runtimes.
    """

    def __init__(self):
        self.python_sandbox = SecurePythonSandbox()
        self.sql_sandbox = SecureSQLSandbox()

    def run_cell(self, cell: NotebookCell, context: Dict[str, Any] = {}) -> NotebookCell:
        cell.status = "running"

        if cell.cell_type == "markdown":
            cell.output = cell.code
            cell.status = "completed"
            cell.execution_time_ms = 0.0

        elif cell.cell_type == "python":
            res = self.python_sandbox.execute(cell.code, context=context)
            cell.status = "completed" if res.success else "error"
            cell.output = res.output if res.success else res.error
            cell.execution_time_ms = res.execution_time_ms

        elif cell.cell_type == "sql":
            res = self.sql_sandbox.execute(cell.code, context=context)
            cell.status = "completed" if res.success else "error"
            cell.output = res.output if res.success else res.error
            cell.execution_time_ms = res.execution_time_ms

        else:
            cell.status = "completed"
            cell.output = cell.code

        return cell
