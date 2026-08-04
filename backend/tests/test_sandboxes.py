import pandas as pd
import sqlite3
from app.execution.python_sandbox import SecurePythonSandbox
from app.execution.sql_sandbox import SecureSQLSandbox

def test_python_sandbox_success():
    sandbox = SecurePythonSandbox()
    df = pd.DataFrame({"a": [1, 2, 3], "b": [10, 20, 30]})
    code = "result = df['a'].sum() + df['b'].sum()"
    res = sandbox.execute(code, context={"df": df, "pd": pd})
    assert res.success is True
    assert res.output == 66

def test_python_sandbox_blocked_sys_import():
    sandbox = SecurePythonSandbox()
    code = "import os; os.system('echo hacked')"
    res = sandbox.execute(code, context={})
    assert res.success is False
    assert "ImportError" in res.error or "NameError" in res.error

def test_sql_sandbox_success():
    sandbox = SecureSQLSandbox()
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE products (id INT, name TEXT, price REAL);")
    conn.execute("INSERT INTO products VALUES (1, 'Widget', 19.99);")
    conn.commit()

    res = sandbox.execute("SELECT * FROM products;", context={"conn": conn})
    assert res.success is True
    assert res.output["row_count"] == 1

def test_sql_sandbox_blocked_drop():
    sandbox = SecureSQLSandbox()
    res = sandbox.execute("DROP TABLE users;", context={})
    assert res.success is False
    assert "Validation Failed" in res.error
