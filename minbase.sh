#!/bin/bash

if [[ ! `whoami` == root ]]; then
    echo "Need to be root."
    exit 1
fi

set -x -e

cd /var/lib/meeci/containers
DIR='./container'
mkdir -p $DIR

debootstrap --arch=amd64 --variant=minbase jessie $DIR http://mirrors.163.com/debian
systemd-nspawn -D $DIR apt-get clean

TAR='meeci-minbase.tgz'
tar zcf $TAR $DIR
rm -rf $DIR
chmod 644 $TAR

set +x

echo "Created $TAR"
ls -lh $TAR
