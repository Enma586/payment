#!/bin/bash
set -e

echo "Running database migrations..."
npx sequelize-cli db:migrate

echo "Starting server..."
exec node server.js