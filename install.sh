#!/bin/bash

# Install Bun
if ! command -v bun &> /dev/null
then
  echo "Installing bun..."
  curl -fsSL https://bun.sh/install | bash
fi

# Install project dependencies
echo "Installing project dependencies"
bun install

# Install bun dependencies globally
echo "Installing global bun dependencies"
bun add --global chevrotain commander figlet zod chalk chalk-template xxhash-wasm codespan-wasm

# Install sc
bun run build
