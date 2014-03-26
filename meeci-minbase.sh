#!/bin/bash

if [[ ! `whoami` == root ]]; then
    echo "Need to be root."
    exit 1
fi

set -e -v

mkdir -p minbase
debootstrap --arch=amd64 --variant=minbase jessie ./minbase \
            http://mirrors.163.com/debian
systemd-nspawn -D ./minbase apt-get clean

tar jcf meeci-minbase.bz2 -C minbase .
rm -rf minbase

set +v

echo "Created meeci-minbase.bz2"
