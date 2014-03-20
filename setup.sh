#!/bin/bash

set -e

if [[ `whoami` != 'root' ]]; then
    echo 'Must run $0 as root.'
    exit 1
fi

# Step 1: install dependencies
apt-get install -y --no-install-recommends \
                vsftpd \
                sqlite3 \
                memcached \
                nodejs \
                npm

npm install -g express
npm install -g sqlite3

# Step 2: create user meeci
if [[ `grep "^meeci" /etc/passwd` == '' ]]; then
    useradd -m -s /bin/bash meeci
fi

# Step 3: create directories
datadir=/var/opt/meeci
mkdir -p $datadir/containers
mkdir -p $datadir/builds
mkdir -p /opt/meeci

exit 0
