#!/bin/bash

# Mirlo Admin User Setup Script
# This script prompts for admin credentials locally and passes them to docker

echo ""
echo "📝 Mirlo Admin User Setup"
echo ""

# Prompt for email
read -p "Admin email address (default: admin@mirlo.local): " email
email=${email:-admin@mirlo.local}

# Prompt for password with confirmation
read -sp "Admin password: " password
echo ""

# Validate password
if [ -z "$password" ]; then
  echo "❌ Error: Password cannot be empty"
  exit 1
fi

read -sp "Confirm admin password: " password_confirm
echo ""

# Check if passwords match
if [ "$password" != "$password_confirm" ]; then
  echo "❌ Error: Passwords do not match"
  exit 1
fi

# Prompt for name
read -p "Admin name (default: Administrator): " name
name=${name:-Administrator}

# Use env file approach to avoid shell escaping issues
docker compose exec -T api sh -c "ADMIN_EMAIL='$email' ADMIN_PASSWORD='$password' ADMIN_NAME='$name' yarn setup:admin"

echo ""
echo "✓ Setup complete!"
