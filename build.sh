#!/bin/bash
PACKAGE_VERSION=$(grep -m1 version package.json | awk -F: '{ print $2 }' | sed 's/[", ]//g')

zip -r build/mailer-$PACKAGE_VERSION.zip index.js env.js node_modules