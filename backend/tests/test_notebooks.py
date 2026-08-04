import json
from app.notebooks.manager import NotebookManager
from app.notebooks.runner import NotebookCellRunner
from app.notebooks.exporter import NotebookExporter

def test_notebook_manager_and_runner():
    mgr = NotebookManager()
    nb = mgr.create_notebook("Financial Audit 2025")
    assert nb.id in mgr._notebooks
    assert len(nb.cells) == 1  # Default markdown cell

    # Add python cell
    py_cell = mgr.add_cell(nb.id, cell_type="python", code="result = 100 * 5")
    assert py_cell is not None

    runner = NotebookCellRunner()
    executed_cell = runner.run_cell(py_cell)
    assert executed_cell.status == "completed"
    assert executed_cell.output == 500

    # Add SQL cell
    sql_cell = mgr.add_cell(nb.id, cell_type="sql", code="SELECT 1 AS num;")
    executed_sql = runner.run_cell(sql_cell)
    assert executed_sql.status == "completed"

def test_notebook_exporter():
    mgr = NotebookManager()
    nb = mgr.create_notebook("Sales Analysis")
    mgr.add_cell(nb.id, cell_type="markdown", code="## Summary Takeaways")

    md_out = NotebookExporter.to_markdown(nb)
    assert "# Sales Analysis" in md_out
    assert "## Summary Takeaways" in md_out

    html_out = NotebookExporter.to_html(nb)
    assert "<html>" in html_out

    json_out = NotebookExporter.to_json(nb)
    parsed = json.loads(json_out)
    assert parsed["title"] == "Sales Analysis"
