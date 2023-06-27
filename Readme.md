# k3d CI/CD (Jenkins, GitLab, GitHub Actions, etc.) Playground 

[![CICD](https://github.com/adavarski/k3d-cicd-playground/workflows/main/badge.svg)](https://github.com/adavarski/k3d-cicd-playground/actions)

## Prerequisites Installation and verification.
Make Installation:
```
sudo apt-get install make
```
 
Docker Installation:
```
sudo apt-get update
sudo apt-get install \
   ca-certificates \
   curl \
   gnupg \
   lsb-release

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

## Local Environment Preparation
KD3 Installation.
```
wget -q -O - https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
```
kubectl Installation.
```
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/kubectl
```
Helm Installation
```
wget https://get.helm.sh/helm-v3.10.1-linux-amd64.tar.gz
unzip file
and move it  /usr/local/bin/helm
```

## Local Cluster Preparation
changed arg in Make file  --k3s-server-arg '--no-deploy=traefik' \   to  --k3s-arg '--no-deploy=traefik' \
 ```make cluster```

if your machine rebooted then need to start cluster
```
sudo k3d cluster start sandman
sudo kubectl create  
```
Note: K8s is Kubernetes. K3s is a lightweight K8s distribution. K3d is a wrapper to run K3s in Docker. K3d/K3s are especially good for development and CI purposes, as it takes only 20-30 seconds of time till the cluster is ready (for comparison, Kind/Minikube takes more time till ready)

## Nginx Ingress Controller
```
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace --set controller.publishService.enabled=true
```

## Prometheus Installation & Configuration
```
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n prometheus --create-namespace
kubectl apply -f ingress-k8s-manifest/grafana.yml
grep grafana /etc/hosts
192.168.1.99 devops grafana.example.com
kubectl get secret --namespace prometheus prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

Browser: http://grafana.example.com:8888/login (admin:above pass)
```

## Application Deployment
```
cd sample-service/k8s-manifest/
kubectl apply -f .
```

### Jenkins Deployment and Configuration
```
helm repo add bitnami https://charts.bitnami.com/bitnami
kubectl create ns jenkins
helm install jenknis bitnami/jenkins
kubectl apply -f ingress-k8s-manifest/jenkins.yaml
kubectl edit svc jenknis-jenkins // Change from type:Loadbalancer -> type: ClusterIP
kubectl edit roles jenknis-jenkins // Add  
rules:
- apiGroups:
  - '*'
  resources:
  - '*'
  verbs:
  - '*'




kubectl get secret --namespace default jenknis-jenkins -o jsonpath="{.data.jenkins-password}" | base64 -d

$ grep jenkins /etc/hosts
192.168.1.99 devops grafana.example.com jenkins.example.com

Browser: http://jenkins.example.com:8888/login (user:above password)

Note/Tip: We can use nip.io for DNS instead of /etc/hosts file for jenkins/prometheus/grafana -> Example: jenkins.192.168.1.99.nip.io for ingress, where 192.168.1.99 is IP of the host where k3d is installed

$ kubectl apply -f ingress-k8s-manifest/jenkins-nip.yaml
$ kubectl get ing
NAME              CLASS   HOSTS                         ADDRESS   PORTS   AGE
jenkins-ingress   nginx   jenkins.192.168.1.99.nip.io             80      5s

Browser: http://jenkins.192.168.1.99.nip.io:8888) (user:above password)



Install Git, Pipeline, Docker, Kubernetes plugins 
Dashboard > Manage Jenkins > Configure System
Jenkins URL -> http://jenkins-jenkins.default.svc.cluster.local/

Dashboard > Manage Jenkins > Configure Clouds
Name: Kubernetes
Kubernetes URL: kubernetes.default.svc.cluster.local
Jenkins URL: http://jenknis-jenkins.default.svc.cluster.local
Pod Label
Key: jenkins
Value: agent
Check: WebSockets


Dashboard > Manage Jenkins > Configure Global Security
Agents
TCP port for inbound agents -> Check: Random

Manage Jenkins > Credentials > System
Global credentials (unrestricted) -> Add user with pasword : dockerHub credentials: ID: Docker


```
### Application CI/CD Configuration.

- Create a pipeline job into jenkins called sample-service
- Go to SCM section and select GIT and enter your github repo URL
- Jenkinsfile path should sample-service
- Add docker hub creds into globle creds into jenkins
- create docker repo into your docker account
- Run the job if all parameters are correct application build and deploy into your k3d cluster


#### [Console Output](./cicd-outputs/consoleText.txt)


Check k8s
```
$ kubectl get po
NAME                               READY   STATUS      RESTARTS      AGE
jenknis-jenkins-68c4f45f87-jw2tm   1/1     Running     0             7h32m
kaniko                             0/1     Completed   0             142m
app-server-7bbc6965b7-jrcsz        1/1     Running     0             24m
dnsutils                           1/1     Running     7 (18m ago)   7h19m

```

### Kaniko examples

#### Kaniko Jenkins ( TODO fix error with DockerHUB: UNAUTHORIZED --->  https://github.com/GoogleContainerTools/kaniko/issues/1209 )
Use Kaniko for building images (inside k8s were CRI is not Docker, but Containerd/CRI-O). Kaniko is a tool to build container images from a Dockerfile, inside a container or Kubernetes cluster. Kaniko doesn't depend on a Docker daemon and executes each command within a Dockerfile completely in userspace. This enables building container images in environments that can't easily or securely run a Docker daemon, such as a standard Kubernetes cluster.
```
### Create a kubernetes secret with docker credentials
kubectl create secret \
    docker-registry regcred \
    --docker-server=https://index.docker.io/v1/ \
    --docker-username=$REGISTRY_USER \
    --docker-password=$REGISTRY_PASS \
    --docker-email=$REGISTRY_EMAIL

### Create config.json for use elsewhere ( via --dry-run )

kubectl create secret docker-registry dockercred  \
    --docker-server="https://index.docker.io/v1/" \
    --docker-username="$REGISTRY_USER"  \
    --docker-password="$REGISTRY_PASS" \
    --docker-email="$REGISTRY_EMAIL" --dry-run=client -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d > config.json
cat config.json
{"auths":{"https://index.docker.io/v1/":{"username":"REGISTRY_USER","password":"REGISTRY_PASS","email":"REGISTRY_EMAIL","auth":"ZG........=="}}}


#### Add config.json as secret file credential
- Navigate to credentials
- Navigate to your domain
- Add Credentials
- Kind: Secret File
- Scope: select proper scope
- File: select the file on your local filesystem
- ID: for the example Jenkinsfile in this repo, use "dockercred"
- Description: enter something meaningful
```
[JenkinsFile:Kaniko](./jenkins-kaniko/Jenkinsfile-Kaniko)

##### [Console Output-Kaniko](./cicd-outputs/consoleText-Kaniko.txt)

For error:
```"+ /kaniko/executor --context /home/jenkins/agent/workspace/test/config.json --destination davarski/kaniko-test-build:1.0
error checking push permissions -- make sure you entered the correct tag name, and that you are authenticated correctly, and try again: checking push permission for "davarski/kaniko-test-build:1.0": UNAUTHORIZED: authentication required; [map[Action:pull Class: Name:davarski/kaniko-test-build Type:repository] map[Action:push Class: Name:davarski/kaniko-test-build Type:repository]]
``` 
See: https://github.com/GoogleContainerTools/kaniko/issues/1209 && https://github.com/GoogleContainerTools/kaniko#pushing-to-docker-hub && https://github.com/GoogleContainerTools/kaniko#known-issues && https://github.com/GoogleContainerTools/kaniko#running-kaniko-in-a-kubernetes-cluster

Note:  We can use for DockerHub this workaround and Jenkinsfile-Kaniko.example
```
cat config.json.template 
{
	"auths": {
		"https://index.docker.io/v1/": {
			"auth": "${BASE64_CREDENTIALS}"
		}
	}

export BASE64_CREDENTIALS=$(echo -n "<USER>:<TOKEN>"| base64) && \
  cat config.json.template | envsubst > config.json && \
  kubectl -n default create secret generic dockercred --from-file=config.json
```

Example build in k8s pod : 
```
$ kubectl apply -f pod-kaniko-build/pod-kaniko-build.yaml 
pod/kaniko configured
$ kubectl logs kaniko
Enumerating objects: 36, done.
Counting objects: 100% (7/7), done.
Compressing objects: 100% (6/6), done.
Total 36 (delta 4), reused 1 (delta 1), pack-reused 29
INFO[0001] Retrieving image manifest ubuntu:latest      
INFO[0001] Retrieving image ubuntu:latest from registry index.docker.io 
INFO[0002] Built cross stage deps: map[]                
INFO[0002] Retrieving image manifest ubuntu:latest      
INFO[0002] Returning cached image manifest              
INFO[0002] Executing 0 build triggers                   
INFO[0002] Building stage 'ubuntu:latest' [idx: '0', base-idx: '-1'] 
INFO[0002] Unpacking rootfs as cmd RUN apt-get update -y requires it. 
INFO[0006] RUN apt-get update -y                        
INFO[0006] Initializing snapshotter ...                 
INFO[0006] Taking snapshot of full filesystem...        
INFO[0013] Cmd: /bin/sh                                 
INFO[0013] Args: [-c apt-get update -y]                 
INFO[0013] Running: [/bin/sh -c apt-get update -y]      
Get:1 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]
Get:2 http://archive.ubuntu.com/ubuntu jammy InRelease [270 kB]
Get:3 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]
Get:4 http://security.ubuntu.com/ubuntu jammy-security/restricted amd64 Packages [456 kB]
Get:5 http://archive.ubuntu.com/ubuntu jammy-backports InRelease [108 kB]
Get:6 http://archive.ubuntu.com/ubuntu jammy/universe amd64 Packages [17.5 MB]
Get:7 http://security.ubuntu.com/ubuntu jammy-security/main amd64 Packages [575 kB]
Get:8 http://security.ubuntu.com/ubuntu jammy-security/multiverse amd64 Packages [36.3 kB]
Get:9 http://security.ubuntu.com/ubuntu jammy-security/universe amd64 Packages [928 kB]
Get:10 http://archive.ubuntu.com/ubuntu jammy/multiverse amd64 Packages [266 kB]
Get:11 http://archive.ubuntu.com/ubuntu jammy/main amd64 Packages [1792 kB]
Get:12 http://archive.ubuntu.com/ubuntu jammy/restricted amd64 Packages [164 kB]
Get:13 http://archive.ubuntu.com/ubuntu jammy-updates/universe amd64 Packages [1176 kB]
Get:14 http://archive.ubuntu.com/ubuntu jammy-updates/main amd64 Packages [857 kB]
Get:15 http://archive.ubuntu.com/ubuntu jammy-updates/multiverse amd64 Packages [42.2 kB]
Get:16 http://archive.ubuntu.com/ubuntu jammy-updates/restricted amd64 Packages [457 kB]
Get:17 http://archive.ubuntu.com/ubuntu jammy-backports/universe amd64 Packages [27.0 kB]
Get:18 http://archive.ubuntu.com/ubuntu jammy-backports/main amd64 Packages [49.4 kB]
Fetched 24.9 MB in 4s (5729 kB/s)
Reading package lists...
INFO[0018] Taking snapshot of full filesystem...        
INFO[0022] Pushing image to davarski/hello-kaniko:1.0   
INFO[0030] Pushed index.docker.io/davarski/hello-kaniko@sha256:9e5e0c301dd171128831083c7953e91e5907871e0e508eaa89846273ebb759f6 
```

#### Kaniko GitLab CI/CD pipeline example  (gcr.io/kaniko-project/executor:debug is working with GitLab Docker Repo)

REF: Repo: https://github.com/adavarski/gitlab-cicd-k8s for GitLab CI & runners installation/setup

Greate GitLab Repo with Dockerfile & [GitLab CI pipeline](./.gitlab-ci.yml)
 

Dockerfile
```
FROM python:3

RUN apt-get update && apt-get install -y python3-netaddr \
  && python -m pip install ansible netaddr \
  && rm -rf /var/lib/apt/lists/*
```
Note: --skip-tls-verify for Self-Signet GitLab certificates
```
    - /kaniko/executor --skip-tls-verify --context ${CI_PROJECT_DIR} --dockerfile ${CI_PROJECT_DIR}/Dockerfile --destination ${CI_REGISTRY_IMAGE}:latest
```
Docker daemon devops server setup:
```
# cat /etc/docker/daemon.json 
{ "insecure-registries" : ["gitlab.devops.davar.com:2053"] }
```
##### [GitLab CI pipeline output](./cicd-outputs/GilLab-pipeline-output.txt)

Note: AWS ECR example with GitLab: https://www.triggermesh.com/blog/storing-serverless-functions-on-aws-ecr-via-gitlab

#### Kaniko GCP Cloud Build example: 

```
steps:
  - id: "Build simple-app in GCP"
    name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - --destination=gcr.io/$PROJECT_ID/simple-app-image:$TRIGGER_NAME
      - --cache-repo=gcr.io/$PROJECT_ID/simple-app
      - --cache=false
      - --build-arg
      - APP_VERSION=$TAG_NAME
      - --build-arg
      - SERVICE=simple-app
      - --build-arg
      - NEXT_PUBLIC_API_GATEWAY_URL=https://api.v3.example.com
  - id: "Deploy to GKE"
    name: "gcr.io/cloud-builders/gke-deploy"
    args:
      - run
      - --filename=./manifests
      - --image=gcr.io/$PROJECT_ID/simple-app-image:$TRIGGER_NAME
      - --location=europe-west3
      - --cluster=cluster-dev
options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'
timeout: 3600s
```
### Clean Local Environment
```
k3d cluster delete sandman
```

### [GitHub Actions CI/CD example](./.github/workflows/)

Ref: https://github.com/AbsaOSS/k3d-action 

### Note: GitLab CI/CD example:
- https://github.com/adavarski/gitlab-cicd-k8s

### Note: Using Tekton (CI part) to build/test/push docker images and ArgoCD (CD part) examples -> DevOps Cloud-native CI/CD GitOps with Tekton & ArgoCD: 
- https://github.com/adavarski/GitOps-k3d-Tekton-ArgoCD-Go (Golang example)
- https://github.com/adavarski/gitops-k3d-tekton-argocd (Java:Maven example)

### GitHub Actions and ArgoCD examples:
- https://github.com/adavarski/k3d-GH-Actions
- https://github.com/adavarski/homelab



