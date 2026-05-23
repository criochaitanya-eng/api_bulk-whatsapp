pipeline {
    agent any

    environment {
        SERVER = "root@64.227.173.147"
        APP_DIR = "/var/www/api_bulk-whatsapp"
        REPO = "https://github.com/criochaitanya-eng/api_bulk-whatsapp.git"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main', url: "${REPO}"
            }
        }

        stage('Deploy to Server') {
            steps {
                sshagent(['droplet-ssh']) {
                    sh """
                    ssh $SERVER '
                        echo "🚀 Deploying to Production Server..."

                        # Ensure folder exists
                        mkdir -p $APP_DIR
                        cd $APP_DIR

                        # Clone or update repo
                        if [ ! -d ".git" ]; then
                            git clone $REPO .
                        else
                            git pull origin main
                        fi

                        echo "📦 Rebuilding Docker containers..."

                        # Stop old containers
                        docker-compose down || true

                        # Build & start new containers
                        docker-compose up --build -d

                        echo "✅ Deployment Successful"
                    '
                    """
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh 'docker system prune -f || true'
            }
        }
    }

    post {
        success {
            echo "🎉 Deployment SUCCESS on 64.227.173.147"
        }
        failure {
            echo "❌ Deployment FAILED"
        }
    }
}