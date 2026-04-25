from copy import deepcopy
from typing import Any


def deep_merge(base: dict, override: dict) -> dict:
    """
    Recursively merge two dictionaries.
    
    Values from 'override' take precedence over 'base'.
    Nested dictionaries are merged recursively.
    
    Args:
        base: Base dictionary with default values
        override: Dictionary with override values
        
    Returns:
        New dictionary with merged values
    """
    result = deepcopy(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result
