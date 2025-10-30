#!/bin/sh

# Install playwright and its dependencies
npx -y playwright@latest install --with-deps chromium

# Install node modules
npm install