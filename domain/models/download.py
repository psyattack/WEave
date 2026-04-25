from dataclasses import dataclass
from typing import Optional


@dataclass
class TaskStatus:
    """
    Status information for a download or extraction task.
    
    Tracks process ID, current status message, and associated metadata.
    """
    task_id: str
    pid: Optional[int] = None
    status: str = "Starting..."
    account: Optional[str] = None  # Account used for download
    output_folder: Optional[str] = None  # Extraction output path


@dataclass
class DownloadRequest:
    """Request to download a workshop item."""
    pubfileid: str
    account_index: int


@dataclass
class ExtractionRequest:
    """Request to extract a downloaded .pkg file."""
    pubfileid: str
    output_directory: str