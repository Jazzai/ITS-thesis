import subprocess
import json

def capture_state(executable_path, line, variable):
    # Generate GDB commands
    gdb_cmds = f"""
    set pagination off
    break {line}
    run
    print {variable}
    quit
    """
    with open("script.gdb", "w") as f:
        f.write(gdb_cmds)
        
    # Run GDB in batch mode
    result = subprocess.run(["gdb", "-batch", "-x", "script.gdb", executable_path], capture_output=True, text=True)
    
    # Parse GDB output (e.g., "$1 = 3")
    for out_line in result.stdout.split('\n'):
        if f" = " in out_line:
            val = out_line.split(" = ")[1]
            return {"line": line, "variable": variable, "actual_value": val.strip()}
    return None
