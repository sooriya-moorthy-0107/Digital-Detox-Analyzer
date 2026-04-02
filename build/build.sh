#!/bin/bash
echo "Building Digital Detox Analyzer..."
mkdir -p dist
cp -r src/* dist/
echo "Build complete. Artifacts in /dist"