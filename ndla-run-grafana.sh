#!/bin/bash

function prepare_remote {
    secretsfile="/tmp/secrets"
    aws s3 --region eu-central-1 cp s3://$NDLA_ENVIRONMENT.secrets.ndla/grafana.secrets $secretsfile

    DATABASE_HOST=$(cat $secretsfile | jq -r .META_SERVER)
    DATABASE_PORT=$(cat $secretsfile | jq -r .META_PORT)

    export GF_DATABASE_HOST=$DATABASE_HOST:$DATABASE_PORT
    export GF_DATABASE_NAME=$(cat $secretsfile | jq -r .META_RESOURCE)
    export GF_DATABASE_USER=$(cat $secretsfile | jq -r .META_USER_NAME)
    export GF_DATABASE_PASSWORD=$(cat $secretsfile | jq -r .META_PASSWORD)
    export GF_AWS_default_ACCESS_KEY_ID=$(cat $secretsfile | jq -r .AWS_ACCESS_KEY_ID)
    export GF_AWS_default_SECRET_ACCESS_KEY=$(cat $secretsfile | jq -r .AWS_SECRET_ACCESS_KEY)

    rm $secretsfile
}

if [ "$NDLA_ENVIRONMENT" != "local" ]
then
    prepare_remote
fi

export GF_SERVER_HTTP_HOST=3000
export GF_DATABASE_TYPE=postgres
export GF_DATABASE_SSL_MODE=disable

/run.sh
