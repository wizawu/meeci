#!/bin/bash

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <PORT>"
    exit 1
fi 

if [[ `pgrep postgres` == '' ]]; then
    echo "PostgreSQL is not running."
    exit 2
fi

set -e

sudo mount --bind /var/lib/meeci/ /srv/ftp/meeci/
sudo chmod -R 777 /srv/ftp/meeci/

if [[ `pgrep vsftpd` == '' ]]; then
    sudo /etc/init.d/vsftpd restart
fi

if [[ `pgrep memcached` == '' ]]; then
    sudo /etc/init.d/memcached restart
fi

cd web
sudo MEECI_PORT=$1 node app
