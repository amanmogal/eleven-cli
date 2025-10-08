#!/bin/bash

echo "🚀 Eleven-CLI Deployment Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Check if npm is logged in
echo "🔐 Checking NPM authentication..."
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Error: Not logged in to NPM. Please run 'npm login' first."
    exit 1
fi

echo "✅ NPM authentication verified"

# Run validation
echo "🧪 Running validation tests..."
npm run validate

if [ $? -ne 0 ]; then
    echo "❌ Validation failed. Please fix issues before deploying."
    exit 1
fi

echo "✅ Validation passed"

# Check if package exists on NPM
PACKAGE_NAME=$(node -p "require('./package.json').name")
echo "📦 Checking if package '$PACKAGE_NAME' exists on NPM..."

if npm view "$PACKAGE_NAME" > /dev/null 2>&1; then
    echo "⚠️  Package already exists on NPM. This will update the existing package."
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled."
        exit 1
    fi
else
    echo "✅ Package name is available"
fi

# Publish to NPM
echo "📤 Publishing to NPM..."
npm publish

if [ $? -eq 0 ]; then
    echo "🎉 Successfully published to NPM!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Test installation: npm install -g $PACKAGE_NAME"
    echo "2. Verify: $PACKAGE_NAME --help"
    echo "3. Check package: https://www.npmjs.com/package/$PACKAGE_NAME"
    echo ""
    echo "🎧 Eleven-CLI is now live on NPM!"
else
    echo "❌ Failed to publish to NPM. Check the error messages above."
    exit 1
fi
