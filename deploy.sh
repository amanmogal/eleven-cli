#!/bin/bash

# Eleven-CLI Deployment Script
# This script handles the complete deployment of Eleven-CLI

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

echo "🚀 Deploying Eleven-CLI..."

# Check prerequisites
print_status "Checking prerequisites..."

command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed."; exit 1; }

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16.0.0 or higher is required. Current version: $(node --version)"
    exit 1
fi

print_success "Prerequisites check passed"

# Install globally
print_status "Installing Eleven-CLI globally..."
npm install -g eleven-voice-cli

# Verify installation
print_status "Verifying installation..."
INSTALLED_VERSION=$(eleven --version)
print_success "Eleven-CLI version $INSTALLED_VERSION installed successfully"

# Set up environment (prompt for API key if not set)
if [ -z "$ELEVEN_API_KEY" ]; then
    print_warning "ElevenLabs API key not found in environment."
    echo ""
    echo "🔑 Please set your ElevenLabs API key:"
    echo "   export ELEVEN_API_KEY=your_api_key_here"
    echo ""
    echo "Or create a .env file:"
    echo "   echo 'ELEVEN_API_KEY=your_api_key_here' > .env"
    echo ""
    echo "Get your API key from: https://elevenlabs.io/app/profile"
    echo ""
fi

# Test basic functionality
print_status "Testing CLI functionality..."
if eleven status >/dev/null 2>&1; then
    print_success "CLI functionality test passed"
else
    print_warning "CLI test failed - this may be due to missing API key"
    echo "Run 'eleven status' manually after setting your API key"
fi

# Create deployment summary
echo ""
print_success "✅ Eleven-CLI deployment completed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Set your ElevenLabs API key (if not already done)"
echo "2. Run 'eleven' to start the magnetic interface"
echo "3. Use 'eleven init my-project' to create your first project"
echo ""
echo "📚 For detailed usage, see: COMPREHENSIVE_USER_GUIDE.md"
echo ""
echo "🎪 Available CLI interfaces:"
echo "   • eleven (Magnetic CLI - recommended)"
echo "   • eleven-classic (Direct commands)"
echo "   • eleven-tab (Background tasks)"
echo "   • eleven-interactive (Simple interactive)"
echo ""
print_success "Happy voice development! 🎧✨"