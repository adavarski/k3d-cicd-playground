cluster:
	k3d cluster create sandman \
	    -p 8888:80@loadbalancer \
	    -v /etc/machine-id:/etc/machine-id:ro \
	    -v /var/log/journal:/var/log/journal:ro \
	    -v /var/run/docker.sock:/var/run/docker.sock \
	    --k3s-arg '--disable=traefik@server:0' \
	    --agents 0
