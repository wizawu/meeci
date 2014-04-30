#!/bin/bash

if [[ ! `whoami` == root ]]; then
    echo "Need to be root."
    exit 1
fi

set -x -e

DIR='./container'
mkdir -p $DIR
debootstrap --arch=amd64 --variant=minbase jessie $DIR \
            http://mirrors.163.com/debian
systemd-nspawn -D $DIR apt-get clean

tar jcf meeci-minbase.bz2 $DIR
rm -rf $DIR

set +x

echo "Created meeci-minbase.bz2"
