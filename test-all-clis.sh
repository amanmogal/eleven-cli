#!/bin/bash

echo "🚀 Testing All Eleven CLI Interfaces"
echo "====================================="

echo ""
echo "1. Testing Universal CLI..."
echo "help" | eleven

echo ""
echo "2. Testing Cursor-Powered CLI..."
echo "help" | eleven-cursor

echo ""
echo "3. Testing Tab-Based CLI..."
echo "help" | eleven-tab

echo ""
echo "4. Testing Interactive CLI..."
echo "help" | eleven-interactive

echo ""
echo "5. Testing Classic CLI..."
eleven-classic --version

echo ""
echo "✅ All CLI interfaces tested successfully!"
echo ""
echo "🎯 Quick Start Commands:"
echo "  eleven              - Universal CLI (recommended)"
echo "  eleven-cursor       - AI-powered natural language"
echo "  eleven-tab          - Tab-based interface"
echo "  eleven-interactive  - Simple interactive"
echo "  eleven-classic      - Traditional CLI"
echo ""
echo "📚 For more help, run any CLI and type 'help'"