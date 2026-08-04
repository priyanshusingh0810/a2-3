import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Type

logger = logging.getLogger("a3.plugins.sdk")

class BasePlugin(ABC):
    """Base interface for third-party plugins in A3 Analytics Enterprise."""

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def version(self) -> str:
        pass

    @abstractmethod
    def initialize(self, app_context: Dict[str, Any]) -> bool:
        """Called when plugin is registered."""
        pass

class PluginRegistry:
    """Registry managing external isolated plugins."""

    _instance = None
    _plugins: Dict[str, BasePlugin] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PluginRegistry, cls).__new__(cls)
            cls._instance._plugins = {}
        return cls._instance

    def register(self, plugin: BasePlugin, context: Dict[str, Any] = {}) -> bool:
        if plugin.name in self._plugins:
            logger.warning(f"Plugin {plugin.name} is already registered. Overwriting.")
        try:
            success = plugin.initialize(context)
            if success:
                self._plugins[plugin.name] = plugin
                logger.info(f"Successfully registered plugin: {plugin.name} v{plugin.version}")
                return True
        except Exception as e:
            logger.error(f"Failed to initialize plugin {plugin.name}: {e}")
        return False

    def get_plugin(self, name: str) -> BasePlugin:
        return self._plugins.get(name)

    def list_plugins(self) -> List[Dict[str, str]]:
        return [
            {"name": p.name, "version": p.version}
            for p in self._plugins.values()
        ]
