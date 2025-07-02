#!/bin/bash

cd `dirname $0`

mkdir -p out/

if [ -f out/awssso-foreflight.zip ]; then
    rm out/awssso-foreflight.zip
fi

# Create the zip file in the out/ folder
zip -r out/awssso-foreflight.zip _locales icons screenshots *.js *.json *.html