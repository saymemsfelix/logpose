#!/bin/bash
set -e

echo "=== SFY Starting ==="
echo "Running database migrations..."

# Execute the main command
exec "$@"
