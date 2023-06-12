## A nodejs REST service to return random stuff

Designed to run in a node:lts-alpine3.10 container

Exposes an http service endpoint on port 80 with the /info context path
and a health endpoint at /health context path

eg:

http://{host}/info
http://{host}/health