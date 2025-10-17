#!/bin/bash

# Eleven-CLI Publishing Script
# This script handles the complete npm publishing process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 Publishing Eleven-CLI to npm..."

# Check if user is logged in to npm
print_status "Checking npm authentication..."
if ! npm whoami >/dev/null 2>&1; then
    print_error "You are not logged in to npm."
    echo ""
    echo "🔑 Please login to npm first:"
    echo "   npm login"
    echo ""
    echo "Or create an account if you don't have one:"
    echo "   npm adduser"
    echo ""
    exit 1
fi

USER_NAME=$(npm whoami)
print_success "Logged in as: $USER_NAME"

# Verify package integrity
print_status "Verifying package integrity..."
if [ ! -f "package.json" ]; then
    print_error "package.json not found!"
    exit 1
fi

# Run pre-publish validation
print_status "Running pre-publish validation..."
if npm run validate >/dev/null 2>&1; then
    print_success "Package validation passed"
else
    print_error "Package validation failed!"
    echo "Please fix the issues before publishing."
    exit 1
fi

# Check if version already exists
PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

print_status "Checking if version $PACKAGE_VERSION already exists..."

if npm view "$PACKAGE_NAME@$PACKAGE_VERSION" >/dev/null 2>&1; then
    print_warning "Version $PACKAGE_VERSION already exists on npm!"
    echo ""
    echo "📈 Options:"
    echo "1. Update version in package.json (current: $PACKAGE_VERSION)"
    echo "2. Use 'npm publish --tag beta' for pre-release"
    echo "3. Use 'npm publish --force' to overwrite (not recommended)"
    echo ""
    read -p "Enter your choice (1-3): " choice

    case $choice in
        1)
            echo "Please update the version in package.json and run this script again."
            exit 0
            ;;
        2)
            print_status "Publishing as beta version..."
            PUBLISH_CMD="npm publish --tag beta"
            ;;
        3)
            print_warning "Forcing publication (not recommended)..."
            PUBLISH_CMD="npm publish --force"
            ;;
        *)
            print_error "Invalid choice. Exiting."
            exit 1
            ;;
    esac
else
    print_success "Version $PACKAGE_VERSION is available"
    PUBLISH_CMD="npm publish"
fi

# Show package information
echo ""
print_status "Package Information:"
echo "  Name: $PACKAGE_NAME"
echo "  Version: $PACKAGE_VERSION"
echo "  Size: $(du -sh . | cut -f1)"
echo ""

# Confirm publication
read -p "🚀 Publish $PACKAGE_NAME@$PACKAGE_VERSION to npm? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    print_status "Publication cancelled."
    exit 0
fi

# Publish the package
print_status "Publishing to npm..."
if eval "$PUBLISH_CMD"; then
    print_success "✅ Package published successfully!"
    echo ""
    echo "🎉 $PACKAGE_NAME@$PACKAGE_VERSION is now available on npm!"
    echo ""
    echo "📦 Installation:"
    echo "   npm install -g $PACKAGE_NAME"
    echo ""
    echo "🔗 Package URL:"
    echo "   https://www.npmjs.com/package/$PACKAGE_NAME"
    echo ""
    echo "📚 Documentation:"
    echo "   See COMPREHENSIVE_USER_GUIDE.md for usage instructions"
    echo ""
    print_success "Happy publishing! 🎊"
else
    print_error "❌ Publication failed!"
    echo ""
    echo "🔍 Common issues:"
    echo "   • Check your npm permissions"
    echo "   • Verify package.json is valid"
    echo "   • Check network connectivity"
    echo "   • Ensure version doesn't already exist"
    echo ""
    exit 1
fi
