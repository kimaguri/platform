#!/bin/bash

# Add Encore to PATH if not already there
export ENCORE_INSTALL=/root/.encore
export PATH=$ENCORE_INSTALL/bin:$PATH

# Ensure pnpm is used for dependency installation
export npm_execpath=$(which pnpm)
export npm_config_user_agent="pnpm"

# Start the tenant management service on the correct port and interface
encore run --port=4001 --listen=0.0.0.0:4001
