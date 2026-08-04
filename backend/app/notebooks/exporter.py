import json
from app.notebooks.manager import NotebookState

class NotebookExporter:
    """
    Exports notebook states into Markdown, HTML, or JSON document packages.
    """

    @staticmethod
    def to_markdown(nb: NotebookState) -> str:
        lines = [f"# {nb.title}", f"*Exported: {nb.updated_at}*", "---"]
        for cell in nb.cells:
            if cell.cell_type == "markdown":
                lines.append(cell.code)
            elif cell.cell_type == "python":
                lines.append(f"```python\n{cell.code}\n```")
                if cell.output:
                    lines.append(f"**Output:**\n```\n{cell.output}\n```")
            elif cell.cell_type == "sql":
                lines.append(f"```sql\n{cell.code}\n```")
                if cell.output:
                    lines.append(f"**Output:**\n```json\n{json.dumps(cell.output, indent=2)}\n```")
            lines.append("")
        return "\n".join(lines)

    @staticmethod
    def to_html(nb: NotebookState) -> str:
        md = NotebookExporter.to_markdown(nb)
        return f"<html><head><title>{nb.title}</title></head><body style='font-family:sans-serif; padding:40px;'><pre>{md}</pre></body></html>"

    @staticmethod
    def to_json(nb: NotebookState) -> str:
        return json.dumps(nb.model_dump(), indent=2)
