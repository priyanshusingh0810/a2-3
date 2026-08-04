"""
Connectors Package for A3 Analytics Enterprise.
Abstracts data source ingestion for CSV, Excel, SQLite, PostgreSQL, MySQL, REST APIs, S3, etc.
"""
from app.connectors.base import BaseConnector, ConnectorMetaData

__all__ = ["BaseConnector", "ConnectorMetaData"]
