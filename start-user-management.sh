#!/bin/bash

# Add Encore to PATH if not already there
export ENCORE_INSTALL=/root/.encore
export PATH=$ENCORE_INSTALL/bin:$PATH

# Ensure pnpm is used for dependency installation
export npm_execpath=$(which pnpm)
export npm_config_user_agent="pnpm"

# Debug information
echo "Starting user management service with port 4002 and listen on 0.0.0.0:4002"

# Start the user management service on the correct port and interface
encore run --port=4002 --listen=0.0.0.0:4002
