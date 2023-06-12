/*6
This pipeline is used to sync git state to deployed state.
Any app.version file update will trigger this pipeline to sync state.
*/

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// CALCULATED VARIABLES
LABEL_NAME  = 'agent-' + new Date().getTime()
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

pipeline {
    agent {
        kubernetes {
            label "$LABEL_NAME"
            yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: jenknis-jenkins
  containers:
  - name: app-builder
    image: docker:latest
    command: ['cat']
    tty: true
    volumeMounts:
    - name: dockersock
      mountPath: /var/run/docker.sock
  volumes:
  - name: dockersock
    hostPath:
      path: /var/run/docker.sock
'''
        }
    }
    environment {
      GIT_SSH_COMMAND = "ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"
      TAG = "${env.BUILD_NUMBER}"
      registryCredential  = 'Docker' 
    }
    stages {
    //  stage('GitClone') {
    //    steps {
    //      container('app-builder') {
    //        script {
    //          git url: 'https://github.com/adavarski/k3d-jenkins-playground.git' 
    //        }
    //      }
    //    }
    //  }
      stage('Prepared') {
        steps {
          container('app-builder') {
            sh '''
	      apk update
	      apk add curl
	      apk add git
              curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
              mv kubectl /usr/local/bin
              chmod +x /usr/local/bin/kubectl
	      git clone https://github.com/adavarski/k3d-playground
            '''
          }
        }
      }
      stage('Build') {
        steps {
          container('app-builder') {
            script {
              docker.withRegistry( 'https://index.docker.io/v1/', registryCredential ) {
                sh '''
		  cd k3d-playground/sample-service
                  docker build -t davarski/sample-app:1.0 .
                  docker push davarski/sample-app:1.0
                '''
              }
            }
          }
        }
      }
      stage('Deploy') {
        steps {
          container('app-builder') {
            sh '''
	      /usr/local/bin/kubectl apply -f k3d-playground/sample-service/k8s-manifest/Deployment.yaml
              /usr/local/bin/kubectl rollout restart deployment app-server --namespace=default
            '''
          }
        }
      }
    }
}
