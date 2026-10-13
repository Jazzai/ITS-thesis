import os
import subprocess
import tempfile
from dataclasses import dataclass


@dataclass
class RunResult:
    stdout: str
    stderr: str
    exit_code: int          # program's exit code; negative = killed by signal (POSIX)
    compiled: bool          # False if g++ failed
    timed_out: bool = False


def compile_and_run(
    source: str,
    stdin_data: str = "",
    compile_timeout: int = 15,
    run_timeout: int = 5,
    max_output_bytes: int = 1_000_000,
) -> RunResult:
    """Compile C++ source with `g++ -g -O0` and run it with a timeout."""
    with tempfile.TemporaryDirectory(prefix="cpp_run_") as tmpdir:
        src_path = os.path.join(tmpdir, "main.cpp")
        bin_path = os.path.join(tmpdir, "main")

        with open(src_path, "w", encoding="utf-8") as f:
            f.write(source)

        # --- Compile ---
        try:
            comp = subprocess.run(
                ["g++", "-g", "-O0", "-std=c++17", src_path, "-o", bin_path],
                capture_output=True,
                text=True,
                timeout=compile_timeout,
            )
        except subprocess.TimeoutExpired:
            return RunResult("", "Compilation timed out.", -1, compiled=False, timed_out=True)
        except FileNotFoundError:
            return RunResult("", "g++ not found. Is it installed and on PATH?", -1, compiled=False)

        if comp.returncode != 0:
            return RunResult(comp.stdout, comp.stderr, comp.returncode, compiled=False)

        # --- Run ---
        try:
            run = subprocess.run(
                [bin_path],
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=run_timeout,
                cwd=tmpdir,
            )
        except subprocess.TimeoutExpired as e:
            def _decode(b):
                if b is None:
                    return ""
                return b.decode("utf-8", errors="replace") if isinstance(b, bytes) else b

            return RunResult(
                _decode(e.stdout)[:max_output_bytes],
                _decode(e.stderr)[:max_output_bytes] + f"\n[Timed out after {run_timeout}s]",
                -1,
                compiled=True,
                timed_out=True,
            )

        return RunResult(
            run.stdout[:max_output_bytes],
            run.stderr[:max_output_bytes],
            run.returncode,
            compiled=True,
        )


if __name__ == "__main__":
    code = r'''
    #include <iostream>
    int main() {
        std::cout << "Hello, world\n";
        return 0;
    }
    '''
    r = compile_and_run(code)
    print(r)