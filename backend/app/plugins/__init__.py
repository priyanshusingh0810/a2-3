"""
Plugin SDK Package for A3 Analytics Enterprise.
Allows external plugins to register custom agents, connectors, charts, and report exports safely.
"""
from app.plugins.sdk import BasePlugin, PluginRegistry

__all__ = ["BasePlugin", "PluginRegistry"]
