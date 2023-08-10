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
  echo "👋 Installing git hooks...";
  npx simple-git-hooks >> /dev/null;
  build;
};

function test() {
  echo "🧪 Running tests...";
  npx vitest --dir ./src --run --coverage;
};

function lint() {
  echo "🧹 Linting...";
  npx eslint ./src --ext ts,tsx;
};

function clean() {
  echo "🧹 Cleaning up...";
  rm -rf dist;
};

function postinstall() {
  echo "👋 Running patches...";
  npx patch-package;
};

function hello() {
  echo "👋 Hello!" $args;
};

function example() {
  echo "👋 Select your example project to run: ";
  examples="$(ls ./examples)";

  select example in $examples; do
    if [ -n "$example" ]; then
      build;
      echo "🚀 Starting $example...";
      cd ./examples/$example;
      # if example is cra, run npm start
      # else run npm run dev
      if [ "$example" = "cra" ]; then
        npm start;
      else
        npm run dev;
      fi
      break;
    else
      echo "👋 Select your example project to run: ";
    fi
  done
};

eval $cmd $args
