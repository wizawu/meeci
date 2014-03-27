#!/bin/bash

if [[ $1 == "-h" || $# -ne 1 ]]; then
    echo "Usage: $0 <PORT>"
    exit 0
fi 

sudo mount --bind /var/lib/meeci/containers/ /srv/ftp/meeci/containers/
sudo MEECI_PORT=$1 node web/app
