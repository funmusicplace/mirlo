#!/bin/sh

echo "Running START.sh Script"

yarn install 
yarn migrate:deploy
yarn staging