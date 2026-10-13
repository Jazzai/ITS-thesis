FROM ubuntu:22.04
RUN apt-get update && apt-get install -y g++ gdb && useradd -m student
USER student
WORKDIR /home/student