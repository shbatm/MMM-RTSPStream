#!/bin/bash
cd ~/MagicMirror/

FILE=~/MagicMirror/js/electron.js

if grep -q before-quit $FILE; then
    echo "Graceful Shutdown patch already applied."
else
    echo "Applying Graceful Shutdown patch to MagicMirror."
    git apply modules/MMM-RTSPStream/shutdown.patch
fi
