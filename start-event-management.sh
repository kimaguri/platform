#!/bin/bash

# Add Encore to PATH if not already there
export ENCORE_INSTALL=/root/.encore
export PATH=$ENCORE_INSTALL/bin:$PATH

# Start the event management service on the correct port and interface
encore run --port=4004 --listen=0.0.0.0:4004
