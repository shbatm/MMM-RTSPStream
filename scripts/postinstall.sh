#!/bin/bash
# Title         : postinstall.sh
# Description   : This script will perform postinstallation tasks for npm
# Author        : shbatm
# Date          : 2019-01-03
# Version       : 0.0.2
# Usage         : ./postinstall.sh
#==============================================================================

if [[ $( which pm2 ) != '/usr/bin/pm2' ]]; then
	sudo npm i -g install pm2
fi

npm link pm2

exit 0;
