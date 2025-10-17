# 🚀 Eleven-Cursor CLI - Complete Deployment Guide

## 📋 **Table of Contents**
1. [Quick Start](#quick-start)
2. [Installation Methods](#installation-methods)
3. [Configuration Setup](#configuration-setup)
4. [Basic Usage](#basic-usage)
5. [Advanced Features](#advanced-features)
6. [Troubleshooting](#troubleshooting)
7. [Development Setup](#development-setup)
8. [Production Deployment](#production-deployment)

---

## 🚀 **Quick Start**

### **1. Install the CLI**
```bash
# Install globally via npm (recommended)
npm install -g eleven-voice-cli

# Verify installation
eleven --version
```

### **2. Set up your API key**
```bash
# Set your ElevenLabs API key
export ELEVEN_API_KEY=your_api_key_here

# Or create a .env file
echo "ELEVEN_API_KEY=your_api_key_here" > .env
```

### **3. Start the Magnetic CLI (Recommended)**
```bash
# Launch the magnetic interface (auto-integrates with Cursor AI)
eleven

# Or use the dedicated magnetic command
npm run magnetic
```

**🎉 You're ready to go! The Magnetic CLI provides the best experience with:**
- 🎨 Beautiful interface with colors and icons
- 🤖 Auto-Cursor AI integration
- ⚡ Magnetic shortcuts (!status, !tips, !history)
- 📋 Background task management
- 💡 Smart auto-complete

---

## 📦 **Installation Methods**

### **Method 1: NPM Global Installation (Recommended)**
```bash
# Install globally
npm install -g eleven-cli

# Verify installation
eleven --help
```

**Pros:**
- Available system-wide
- Easy to use from anywhere
- Automatic updates with npm

**Cons:**
- Requires global npm permissions
- May conflict with other global packages

### **Method 2: NPM Local Installation**
```bash
# Create a project directory
mkdir my-voice-projects
cd my-voice-projects

# Install locally
npm init -y
npm install eleven-cli

# Use via npx
npx eleven --help
```

**Pros:**
- No global permissions needed
- Project-specific installation
- Version control friendly

**Cons:**
- Must use `npx` prefix
- Not available system-wide

### **Method 3: Clone and Run**
```bash
# Clone the repository
git clone https://github.com/silver-team/eleven-cli.git
cd eleven-cli

# Install dependencies
npm install

# Run directly
node bin/index.js --help
```

**Pros:**
- Full source code access
- Can modify and contribute
- Development setup

**Cons:**
- Requires manual updates
- More complex setup

---

## ⚙️ **Configuration Setup**

### **Environment Variables**

Create a `.env` file in your project root:

```bash
# ElevenLabs API Configuration
ELEVEN_API_KEY=your_elevenlabs_api_key_here
DEFAULT_VOICE_ID=EXAVITQu4vr4xnSDxMaL

# Cursor CLI Configuration
CURSOR_AGENT_PATH=cursor-agent
CURSOR_PROJECT_PATH=./

# Debug and Logging
DEBUG=false
LOG_LEVEL=info
SILENT=false

# API Configuration
ELEVEN_API_BASE_URL=https://api.elevenlabs.io/v1
REQUEST_TIMEOUT=30000
MAX_RETRIES=3

# Output Directories
DEFAULT_OUTPUT_DIR=./output
TEMP_DIR=./temp
```

### **Configuration File**

Create `eleven-config.json` for persistent settings:

```json
{
  "elevenApiKey": "your_api_key_here",
  "defaultVoiceId": "EXAVITQu4vr4xnSDxMaL",
  "outputDir": "./output",
  "tempDir": "./temp",
  "debug": false,
  "logLevel": "info",
  "cache": {
    "enabled": true,
    "maxSize": "100MB",
    "ttl": "5m"
  },
  "api": {
    "timeout": 30000,
    "maxRetries": 3,
    "rateLimit": {
      "requests": 100,
      "window": "1m"
    }
  }
}
```

### **Configuration Commands**

```bash
# Show current configuration
eleven config --show

# Set configuration values
eleven config --set elevenApiKey your_new_key

# Reset to defaults
eleven config --reset

# Interactive configuration
eleven config --interactive
```

---

## 🎯 **Basic Usage**

### **1. Project Initialization**

```bash
# Create a basic voice agent
eleven init my-voice-agent

# Create with specific template
eleven init my-react-app --template react-voice

# Create with custom settings
eleven init my-python-bot --template python-voice --author "Your Name"
```

**Available Templates:**
- `voice-agent` - Basic Node.js voice agent
- `react-voice` - React-based voice application
- `python-voice` - Python Flask voice bot

### **2. Voice Testing**

```bash
# Test with default voice
eleven test --text "Hello, world!"

# Test with specific voice
eleven test --text "Hello, world!" --voice EXAVITQu4vr4xnSDxMaL

# Interactive testing
eleven test --interactive

# Batch testing
eleven test --batch --file test-sentences.txt
```

### **3. Voice Tuning**

```bash
# Interactive voice tuning
eleven tune --interactive

# Tune specific voice
eleven tune --voice EXAVITQu4vr4xnSDxMaL

# Apply preset settings
eleven tune --preset professional

# Custom tuning
eleven tune --stability 0.8 --similarity 0.9
```

### **4. Voice Cloning**

```bash
# Interactive voice cloning
eleven clone --interactive

# Clone from audio file
eleven clone --file sample.wav --name "My Voice"

# List cloned voices
eleven clone --list

# Test cloned voice
eleven clone --test --voice cloned_voice_id
```

### **5. Voice Analysis**

```bash
# Analyze voice quality
eleven analyze --voice EXAVITQu4vr4xnSDxMaL

# Analyze with sample text
eleven analyze --voice EXAVITQu4vr4xnSDxMaL --text "Sample text"

# Save analysis results
eleven analyze --voice EXAVITQu4vr4xnSDxMaL --save

# Interactive analysis
eleven analyze --interactive
```

### **6. Documentation Generation**

```bash
# Generate project documentation
eleven docs --project

# Generate API documentation
eleven docs --api

# Generate with Cursor AI
eleven docs --ai --project

# Interactive documentation
eleven docs --interactive
```

---

## 🔧 **Advanced Features**

### **1. Advanced Command**

```bash
# Performance dashboard
eleven advanced --performance

# Analytics dashboard
eleven advanced --analytics

# Plugin management
eleven advanced --plugins

# Run comprehensive tests
eleven advanced --test

# Generate documentation
eleven advanced --docs

# System optimization
eleven advanced --optimize

# System health check
eleven advanced --health
```

### **2. Plugin System**

```bash
# List installed plugins
eleven advanced --list-plugins

# Install plugin
eleven advanced --install-plugin plugin-name

# Uninstall plugin
eleven advanced --uninstall-plugin plugin-name

# Reload plugin
eleven advanced --reload-plugin plugin-name
```

### **3. System Monitoring**

```bash
# Check system status
eleven status

# Check API connectivity
eleven status --api

# Check Cursor CLI
eleven status --cursor

# Full health check
eleven status --full
```

---

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. "Command not found" Error**
```bash
# Solution: Ensure global installation
npm install -g eleven-cli

# Or use npx
npx eleven --help
```

#### **2. "Invalid API key" Error**
```bash
# Solution: Set your API key
export ELEVEN_API_KEY=your_api_key_here

# Or create .env file
echo "ELEVEN_API_KEY=your_api_key_here" > .env
```

#### **3. "Permission denied" Error**
```bash
# Solution: Fix npm permissions
sudo npm install -g eleven-cli

# Or use a Node version manager
nvm install node
nvm use node
npm install -g eleven-cli
```

#### **4. "Network timeout" Error**
```bash
# Solution: Check network and API status
eleven status --api

# Increase timeout
export REQUEST_TIMEOUT=60000
```

#### **5. "Template not found" Error**
```bash
# Solution: List available templates
eleven init --list-templates

# Use correct template name
eleven init my-project --template voice-agent
```

### **Debug Mode**

```bash
# Enable debug mode
eleven --debug test --text "Hello"

# Set log level
eleven --log-level debug test --text "Hello"

# Verbose output
eleven --verbose test --text "Hello"
```

### **Log Files**

```bash
# Check logs
tail -f ~/.eleven-cli/logs/app.log

# Clear logs
rm -rf ~/.eleven-cli/logs/*
```

---

## 💻 **Development Setup**

### **1. Clone Repository**

```bash
# Clone the repository
git clone https://github.com/silver-team/eleven-cli.git
cd eleven-cli

# Install dependencies
npm install

# Link for global access
npm link
```

### **2. Development Scripts**

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Validate everything
npm run validate
```

### **3. Environment Setup**

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Set up development API key
export ELEVEN_API_KEY=your_dev_api_key
```

### **4. Testing**

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/basic.test.js

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## 🏭 **Production Deployment**

### **1. Server Setup**

```bash
# Install Node.js (16.0.0+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install eleven-cli
sudo npm install -g eleven-cli

# Create service user
sudo useradd -m -s /bin/bash eleven-cli
sudo su - eleven-cli
```

### **2. Configuration**

```bash
# Create configuration directory
mkdir -p ~/.eleven-cli
cd ~/.eleven-cli

# Create production config
cat > eleven-config.json << EOF
{
  "elevenApiKey": "your_production_api_key",
  "defaultVoiceId": "EXAVITQu4vr4xnSDxMaL",
  "outputDir": "/var/lib/eleven-cli/output",
  "tempDir": "/tmp/eleven-cli",
  "debug": false,
  "logLevel": "info",
  "cache": {
    "enabled": true,
    "maxSize": "500MB",
    "ttl": "1h"
  }
}
EOF
```

### **3. Systemd Service**

```bash
# Create systemd service
sudo tee /etc/systemd/system/eleven-cli.service << EOF
[Unit]
Description=Eleven-Cursor CLI Service
After=network.target

[Service]
Type=simple
User=eleven-cli
WorkingDirectory=/home/eleven-cli
ExecStart=/usr/bin/eleven advanced --health
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable eleven-cli
sudo systemctl start eleven-cli
```

### **4. Deployment Script**

Create a deployment script for easy setup:

```bash
#!/bin/bash
# deploy.sh - Eleven-CLI Deployment Script

set -e

echo "🚀 Deploying Eleven-CLI..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

# Install globally
echo "📦 Installing Eleven-CLI globally..."
npm install -g eleven-voice-cli

# Verify installation
echo "✅ Verifying installation..."
eleven --version

# Set up environment (prompt for API key if not set)
if [ -z "$ELEVEN_API_KEY" ]; then
    echo "🔑 ElevenLabs API key not found in environment."
    echo "Please set your API key:"
    echo "export ELEVEN_API_KEY=your_api_key_here"
    echo "Or create a .env file with ELEVEN_API_KEY=your_api_key_here"
fi

# Test basic functionality
echo "🧪 Testing CLI functionality..."
eleven status

echo "✅ Eleven-CLI deployment completed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Set your ElevenLabs API key (if not already done)"
echo "2. Run 'eleven' to start the magnetic interface"
echo "3. Use 'eleven init my-project' to create your first project"
echo ""
echo "📚 For detailed usage, see: COMPREHENSIVE_USER_GUIDE.md"
```

**Usage:**
```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### **5. Nginx Configuration**

```nginx
# /etc/nginx/sites-available/eleven-cli
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **6. Monitoring**

```bash
# Install monitoring tools
sudo apt-get install htop iotop

# Monitor service
sudo systemctl status eleven-cli

# View logs
sudo journalctl -u eleven-cli -f

# Monitor resources
htop
```

---

## 📊 **Performance Optimization**

### **1. Cache Configuration**

```bash
# Increase cache size
eleven config --set cache.maxSize 500MB

# Set cache TTL
eleven config --set cache.ttl 1h

# Enable persistent cache
eleven config --set cache.persistent true
```

### **2. API Optimization**

```bash
# Increase request timeout
eleven config --set api.timeout 60000

# Set retry count
eleven config --set api.maxRetries 5

# Configure rate limiting
eleven config --set api.rateLimit.requests 200
```

### **3. System Optimization**

```bash
# Run system optimization
eleven advanced --optimize

# Clear cache
eleven advanced --clear-cache

# Clean up temporary files
eleven advanced --cleanup
```

---

## 🔒 **Security Best Practices**

### **1. API Key Security**

```bash
# Use environment variables
export ELEVEN_API_KEY=your_key

# Set proper file permissions
chmod 600 .env
chmod 600 eleven-config.json

# Rotate API keys regularly
eleven config --set elevenApiKey new_key
```

### **2. File Permissions**

```bash
# Set secure permissions
chmod 755 ~/.eleven-cli
chmod 644 ~/.eleven-cli/*.json
chmod 600 ~/.eleven-cli/*.key
```

### **3. Network Security**

```bash
# Use HTTPS for API calls
eleven config --set api.https true

# Set up firewall rules
sudo ufw allow 3000
sudo ufw enable
```

---

## 📚 **Additional Resources**

### **Documentation**
- [API Reference](./docs/api/index.md)
- [Command Reference](./docs/commands/index.md)
- [Examples](./docs/examples/index.md)
- [Troubleshooting](./docs/troubleshooting.md)

### **Support**
- [GitHub Issues](https://github.com/silver-team/eleven-cli/issues)
- [Discord Community](https://discord.gg/eleven-cli)
- [Email Support](mailto:support@silver.dev)

### **Examples**
- [Voice Agent Examples](./examples/voice-agents/)
- [Integration Examples](./examples/integrations/)
- [Plugin Examples](./examples/plugins/)

---

## 🎉 **You're Ready!**

You now have everything you need to deploy and use the Eleven-Cursor CLI effectively. The tool is production-ready and can handle enterprise-level voice agent development with ElevenLabs integration.

**Happy voice agent building!** 🎧✨