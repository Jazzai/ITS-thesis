# ITS-thesis
Development of Intelligent Tutoring System

# Setting Up / Installation
Setup and Requirements
1. **Prerequisites**
| Tool | Version | Purpose|
|Python	| 3.10+ (Docker image uses 3.12) | Backend (FastAPI)
|Node.js + npm | 20.19+ or 22.12+ | Frontend (Vite 8)
|g++ (build-essential) | any recent | Compiles student C++ code
|gdb | any recent | Captures runtime values at checkpoints
|Ollama	| latest | Runs the Llama model for hints
|Docker	| optional | Containerized backend
|Git | any | Clone the repo

sqlite3 is part of Python’s standard library, so it needs no separate install.

2. **Install the prerequisites**

**Windows**

    1. Install Python from https://www.python.org/downloads/ and tick “Add Python to PATH”.
    2. Install Node.js LTS from https://nodejs.org/.
    3. Install g++ and gdb through MSYS2 (https://www.msys2.org/). In the MSYS2 UCRT64 terminal run:
   
   ```bash
   pacman -S mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-
   ```

Then add `C:\msys64\ucrt64\bin` to your PATH.
    4. Install Ollama from https://ollama.com/download.
    5. (Optional) Install Docker Desktop from https://www.docker.com/products/docker-desktop/.

**Ubuntu/Debian**

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv build-essential gdb git
curl -fsSL https://ollama.com/install.sh | sh
```

Install Node.js 22 from https://nodejs.org/ or with nvm.

**macOS**

```bash
brew install python node gdb git ollama
xcode-select --install
```

`gdb` on macOS needs code signing and is unreliable. Use Docker or Linux for the tracing features.

Verify the installs:

```bash
python --version
node --version
npm --version
g++ --version
gdb --version
ollama --version
```

3. **Pull the Llama model**

```bash
ollama pull llama3.1:8b
```
Make sure Ollama is running (`ollama serve`, or the desktop app).

4. **Backend setup**

```bash
Run these from the repository root.

python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install fastapi "uvicorn[standard]" httpx libclang
```

Packages:

- `fastapi`: web framework (installs `pydantic` too)
- `uvicorn[standard]`: ASGI server with extras (`uvicorn` alone also works)
- `httpx`: HTTP client used to call Ollama
- `libclang`: AST parsing of student code

Optional environment variables:

```bash
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

5. **Frontend setup**

```bash
cd frontend
npm install
```

This installs `react`, `react-dom`, `axios`, `@monaco-editor/react`, `vite`, `@vitejs/plugin-react`, and `oxlint`.

If the backend isn’t at `http://localhost:8000`, create `frontend/.env`:

```bash
VITE_API_URL=http://localhost:
```

6. **Run the project**

Open two terminals.

**Terminal 1: backend (from the repo root, with the venv active)**

```bash
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

Run it from the repo root. The app writes its SQLite log to `data/sessions.db` relative to the working directory.

**Terminal 2: frontend**

```bash
cd frontend
npm run dev
```

Open http://localhost:5174 (Vite also allows 5173). The backend’s CORS is configured for those two ports only.

7. **Run with Docker (optional)**

```bash
docker build -t itsthesis:latest .
docker run -p 8000:8000 --cap-add=SYS_PTRACE --security-opt seccomp=unconfined itsthesis:latest
```

- `--cap-add=SYS_PTRACE` and the seccomp option are needed so gdb can trace the compiled program inside the container.
- The image sets `OLLAMA_URL=http://host.docker.internal:11434`, so Ollama must run on the host. On Linux, also add `--add-host=host.docker.internal:host-gateway`.
- The image runs the backend only. Run the frontend with `npm run dev` on the host.

8. **Troubleshooting**

- `g++` or `gdb` not found: add the compiler’s `bin` folder to your PATH, then restart the terminal.
- `libclang` errors: reinstall with `pip install --force-reinstall libclang`.
- **Hints always fall back to templates**: Ollama isn’t running, or `llama3.1:8b` isn’t pulled. The backend logs the hint `source` as `template` in this case.
- **Frontend shows mock data**: the backend is unreachable. Check that it’s running on port 8000.

# How to Run

1. Build Docker Sandbox Image:
    cd backend/sandbox
    docker build -t cpp-sandbox .

2. Start FastAPI backend:
    cd ../../  # Go back to the its-project root folder
    .\venv\Scripts\activate
    uvicorn backend.sandbox.main:app --reload

in another window terminal

3. Start  React app:
    cd its-project/frontend
    npm run dev
