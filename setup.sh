#!/bin/bash

if [[ `whoami` != root ]]; then
    echo "Need to be root."
    exit 1
fi

set -x -e

apt-get install -y --no-install-recommends \
                debootstrap memcached nodejs vsftpd

mkdir -p /var/lib/meeci/logs/container
mkdir -p /var/lib/meeci/logs/build
mkdir -p /var/lib/meeci/containers
mkdir -p /srv/ftp/meeci

chmod -R 777 /var/lib/meeci

set +x
echo "Perform the following steps manually:"
echo "[1] install PostgreSQL"
echo "[2] uncomment 'write_enable=YES' and 'anon_upload_enable=YES' in /etc/vsftpd.conf"
echo "[3] sudo /etc/init.d/vsftpd restart"

set +x
echo "Then you can start meeci-web with: ./meeci-web.sh 80"
