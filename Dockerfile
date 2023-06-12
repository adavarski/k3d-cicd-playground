FROM python:3

RUN apt-get update && apt-get install -y python3-netaddr \
  && python -m pip install ansible netaddr \
  && rm -rf /var/lib/apt/lists/*
