from fastapi import FastAPI
from pydantic import BaseModel
import subprocess
import docker

app = FastAPI()
client = docker.from_env()

class CodeSubmit(BaseModel):
    code: str

@app.post("/run")
def run_code(submit: CodeSubmit):
    # Write code to temp file, run via Docker container
    with open("temp.cpp", "w") as f:
        f.write(submit.code)
    
    try:
        # Compile with debug symbols and no optimization
        subprocess.run(["g++", "-g", "-O0", "temp.cpp", "-o", "prog"], check=True)
        # Execute in sandbox (mocked here for simplicity without actual docker volume binding)
        result = subprocess.run(["./prog"], capture_output=True, text=True, timeout=5)
        return {"stdout": result.stdout, "stderr": result.stderr, "exit_code": result.returncode}
    except subprocess.TimeoutExpired:
        return {"error": "Timeout"}
    except subprocess.CalledProcessError as e:
        return {"error": "Compile Error", "stderr": e.stderr}