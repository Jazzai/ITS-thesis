FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        build-essential \
        gdb \
        python3 \
        python3-pip \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Ubuntu 24.04 marks system Python as externally managed, hence the flag
RUN pip install --no-cache-dir --break-system-packages fastapi uvicorn httpx libclang

# Student code compiles and runs as a non-root user
RUN useradd -m sandbox
WORKDIR /app
COPY . /app
RUN mkdir -p /app/data && chown -R sandbox:sandbox /app
USER sandbox

ENV OLLAMA_URL=http://host.docker.internal:11434
ENV OLLAMA_MODEL=llama3.1:8b

EXPOSE 8000
CMD ["python3", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]