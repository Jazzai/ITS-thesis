"""Thin Ollama client shared by the EED and control conditions."""
import json
import os

import httpx

# From inside Docker (Windows/Mac) use http://host.docker.internal:11434
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

# Identical for both conditions so RQ2 compares context, not sampling settings.
OPTIONS = {"temperature": 0.2, "seed": 42, "num_predict": 220}


class LLMError(Exception):
    pass


def chat(system: str, user: str, schema: dict | None = None, timeout: float = 45.0):
    """Return text, or a parsed dict when a JSON schema is supplied."""
    payload = {
        "model": MODEL,
        "stream": False,
        "options": OPTIONS,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    if schema:
        payload["format"] = schema  # Ollama structured output
    try:
        r = httpx.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=timeout)
        r.raise_for_status()
        content = r.json()["message"]["content"].strip()
        return json.loads(content) if schema else content
    except (httpx.HTTPError, KeyError, ValueError) as e:
        raise LLMError(str(e)) from e