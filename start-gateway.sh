#!/bin/bash

# Explicitly set the path to Encore CLI
ENCORE_CLI_PATH=/root/.encore/bin/encore

# Check if Encore CLI exists
if [ ! -f "$ENCORE_CLI_PATH" ]; then
  echo "Encore CLI not found at $ENCORE_CLI_PATH"
  echo "Installing Encore CLI..."
  curl -L https://encore.dev/install.sh | bash
fi

# Add Encore to PATH
export ENCORE_INSTALL=/root/.encore
export PATH=$ENCORE_INSTALL/bin:$PATH

# Verify Encore CLI is available
if ! command -v encore &> /dev/null; then
  echo "Encore CLI could not be found in PATH"
  echo "Trying to use explicit path..."
  $ENCORE_CLI_PATH version
else
  echo "Encore CLI version: $(encore version)"
fi

# Ensure pnpm is used for dependency installation
export npm_execpath=$(which pnpm)
export npm_config_user_agent="pnpm"

# Start the API Gateway with explicit host and port
$ENCORE_CLI_PATH run --port=4000 --listen=0.0.0.0:4000
