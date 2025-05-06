#!/bin/bash
if [ -f .git/index.lock ]; then
  rm .git/index.lock
  echo "Git index.lock file removed successfully"
else
  echo "No Git index.lock file found"
fi