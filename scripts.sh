#!/bin/bash

# All package scripts to not polute
# package.json file with long scripts

cmd=$1
args=${@:2}

function dev() {
  echo "🚀 Starting dev server...";
  npx rollup -c --watch;
};

function build() {
  clean;
  echo "📦 Building package...";
  npx rollup -c;
};

function prepare() {
  echo "📦 👋 Preparing package...";
  build;
};

function test() {
  echo "🧪 Running tests...";
  npx vitest;
};

function clean() {
  echo "🧹 Cleaning up...";
  rm -rf dist;
};

function hello() {
  echo "👋 Hello!" $args;
};

eval $cmd $args
