#!/bin/bash

# Builder tous les packages partagés
echo "Building shared packages..."
pnpm install
pnpm run -r build

# Builder chaque service
echo "Building identity-api..."
cd services/identity-api
pnpm run build
cd ../..

echo "Building ambassade-api..."
cd services/ambassade-api
pnpm run build
cd ../..

echo "Building communaute-api..."
cd services/communaute-api
pnpm run build
cd ../..

echo "Build completed!"