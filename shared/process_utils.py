import subprocess


def kill_process_by_name(process_name: str) -> bool:
    """
    Terminate process by name on Windows.
    
    Uses taskkill command to forcefully terminate the process.
    
    Args:
        process_name: Name of the process executable (e.g., "notepad.exe")
        
    Returns:
        True if command executed successfully, False otherwise
    """
    try:
        subprocess.run(
            f"taskkill /f /im {process_name}",
            creationflags=subprocess.CREATE_NO_WINDOW,
            check=False,
        )
        return True
    except Exception:
        return False