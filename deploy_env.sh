#!/bin/bash
# Reads .env and pushes all variables to Azure App Service

APP_NAME="nyayasetu-api"
RESOURCE_GROUP="ai_for_bharat"

# Build --settings arguments from .env (skip comments and blank lines)
SETTINGS=$(grep -v '^\s*#' .env | grep '=' | while IFS= read -r line; do
  echo "$line"
done | tr '\n' ' ')

az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings $SETTINGS

echo "Done. Env vars pushed to $APP_NAME"
