from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import pandas as pd
from pydantic import BaseModel

class ConnectorMetaData(BaseModel):
    connector_type: str
    source_name: str
    row_count: int = 0
    column_count: int = 0
    columns: Dict[str, str] = {}
    is_connected: bool = False

class BaseConnector(ABC):
    """Abstract base class for all enterprise data connectors."""

    @abstractmethod
    def test_connection(self) -> bool:
        """Verifies if the target data source is reachable."""
        pass

    @abstractmethod
    def fetch_data(self, query_or_options: Dict[str, Any], limit: Optional[int] = None) -> pd.DataFrame:
        """Fetches data into a standard pandas DataFrame."""
        pass

    @abstractmethod
    def get_metadata(self) -> ConnectorMetaData:
        """Returns structural schema metadata of the data source."""
        pass
