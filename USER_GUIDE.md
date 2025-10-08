# 🎧 Eleven-Cursor CLI - Complete User Guide

## 📋 **Table of Contents**
1. [What is Eleven-Cursor?](#what-is-eleven-cli)
2. [Getting Started](#getting-started)
3. [Command Reference](#command-reference)
4. [Project Templates](#project-templates)
5. [Voice Features](#voice-features)
6. [Advanced Features](#advanced-features)
7. [Examples & Use Cases](#examples--use-cases)
8. [Tips & Best Practices](#tips--best-practices)
9. [FAQ](#faq)

---

## 🤔 **What is Eleven-Cursor?**

**Eleven-Cursor** is an enterprise-grade CLI tool that makes it incredibly easy to build voice agents and applications using ElevenLabs' powerful text-to-speech technology. It combines the power of ElevenLabs' voice synthesis with AI assistance from Cursor to create a comprehensive voice development platform.

### **Key Features**
- 🎧 **Voice Synthesis** - High-quality text-to-speech with ElevenLabs
- 🤖 **AI Integration** - Cursor AI for documentation and code generation
- 🎭 **Voice Cloning** - Create custom voices from audio samples
- 📊 **Voice Analysis** - Analyze and optimize voice quality
- 🏗️ **Project Scaffolding** - Quick project setup with templates
- 🔌 **Plugin System** - Extensible architecture for custom features
- 📈 **Analytics** - Track usage and performance metrics
- 🧪 **Testing** - Comprehensive testing framework

### **Who Should Use It?**
- **Developers** building voice applications
- **AI Engineers** working with voice technology
- **Product Managers** creating voice products
- **Researchers** exploring voice AI
- **Students** learning voice development

---

## 🚀 **Getting Started**

### **Step 1: Installation**

```bash
# Install globally
npm install -g eleven-cli

# Verify installation
eleven --version
```

### **Step 2: Get Your API Key**

1. Go to [ElevenLabs](https://elevenlabs.io)
2. Sign up for an account
3. Get your API key from the dashboard
4. Set it as an environment variable:

```bash
export ELEVEN_API_KEY=your_api_key_here
```

### **Step 3: Create Your First Project**

```bash
# Create a new voice agent project
eleven init my-voice-agent

# Navigate to your project
cd my-voice-agent

# Test voice synthesis
eleven test --text "Hello, world!"
```

**🎉 Congratulations! You've created your first voice agent!**

---

## 📖 **Command Reference**

### **Core Commands**

#### **`init` - Create New Projects**
```bash
# Basic project creation
eleven init my-project

# With specific template
eleven init my-react-app --template react-voice

# With custom author
eleven init my-bot --author "Your Name"

# Interactive mode
eleven init --interactive
```

**Options:**
- `--template <name>` - Choose project template
- `--author <name>` - Set project author
- `--interactive` - Interactive project setup
- `--yes` - Skip confirmations

#### **`test` - Test Voice Synthesis**
```bash
# Basic test
eleven test --text "Hello, world!"

# With specific voice
eleven test --text "Hello!" --voice EXAVITQu4vr4xnSDxMaL

# Interactive testing
eleven test --interactive

# Batch testing
eleven test --batch --file sentences.txt
```

**Options:**
- `--text <text>` - Text to synthesize
- `--voice <id>` - Voice ID to use
- `--interactive` - Interactive mode
- `--batch` - Batch processing
- `--file <path>` - Input file for batch

#### **`docs` - Generate Documentation**
```bash
# Generate project docs
eleven docs --project

# Generate API docs
eleven docs --api

# With Cursor AI
eleven docs --ai --project

# Interactive mode
eleven docs --interactive
```

**Options:**
- `--project` - Generate project documentation
- `--api` - Generate API documentation
- `--ai` - Use Cursor AI assistance
- `--interactive` - Interactive mode

#### **`tune` - Voice Parameter Tuning**
```bash
# Interactive tuning
eleven tune --interactive

# Tune specific voice
eleven tune --voice EXAVITQu4vr4xnSDxMaL

# Apply preset
eleven tune --preset professional

# Custom parameters
eleven tune --stability 0.8 --similarity 0.9
```

**Options:**
- `--voice <id>` - Voice ID to tune
- `--preset <name>` - Apply preset settings
- `--stability <value>` - Stability parameter (0-1)
- `--similarity <value>` - Similarity parameter (0-1)
- `--interactive` - Interactive mode

#### **`config` - Configuration Management**
```bash
# Show current config
eleven config --show

# Set configuration
eleven config --set elevenApiKey new_key

# Reset to defaults
eleven config --reset

# Interactive config
eleven config --interactive
```

**Options:**
- `--show` - Display current configuration
- `--set <key> <value>` - Set configuration value
- `--reset` - Reset to defaults
- `--interactive` - Interactive configuration

#### **`status` - System Health Check**
```bash
# Basic status
eleven status

# Check API connectivity
eleven status --api

# Check Cursor CLI
eleven status --cursor

# Full health check
eleven status --full
```

**Options:**
- `--api` - Check API connectivity
- `--cursor` - Check Cursor CLI
- `--full` - Complete health check

### **Advanced Voice Commands**

#### **`clone` - Voice Cloning**
```bash
# Interactive cloning
eleven clone --interactive

# Clone from file
eleven clone --file sample.wav --name "My Voice"

# List cloned voices
eleven clone --list

# Test cloned voice
eleven clone --test --voice cloned_id
```

**Options:**
- `--file <path>` - Audio file to clone
- `--name <name>` - Name for cloned voice
- `--list` - List cloned voices
- `--test` - Test cloned voice
- `--interactive` - Interactive mode

#### **`analyze` - Voice Analysis**
```bash
# Analyze voice quality
eleven analyze --voice EXAVITQu4vr4xnSDxMaL

# With sample text
eleven analyze --voice EXAVITQu4vr4xnSDxMaL --text "Sample"

# Save results
eleven analyze --voice EXAVITQu4vr4xnSDxMaL --save

# Interactive analysis
eleven analyze --interactive
```

**Options:**
- `--voice <id>` - Voice ID to analyze
- `--text <text>` - Sample text for analysis
- `--save` - Save analysis results
- `--interactive` - Interactive mode

### **System Commands**

#### **`advanced` - Advanced Features**
```bash
# Performance dashboard
eleven advanced --performance

# Analytics dashboard
eleven advanced --analytics

# Plugin management
eleven advanced --plugins

# Run tests
eleven advanced --test

# Generate docs
eleven advanced --docs

# System optimization
eleven advanced --optimize

# Health check
eleven advanced --health
```

**Options:**
- `--performance` - Show performance metrics
- `--analytics` - Show analytics dashboard
- `--plugins` - Manage plugins
- `--test` - Run comprehensive tests
- `--docs` - Generate documentation
- `--optimize` - Optimize system performance
- `--health` - System health check

---

## 🏗️ **Project Templates**

### **1. Voice Agent Template**
```bash
eleven init my-agent --template voice-agent
```

**What you get:**
- Basic Node.js voice agent
- ElevenLabs integration
- Simple voice synthesis
- Configuration management
- Error handling

**Files created:**
```
my-agent/
├── package.json
├── .env.example
├── src/
│   └── voice-agent.js
└── README.md
```

### **2. React Voice App Template**
```bash
eleven init my-app --template react-voice
```

**What you get:**
- React-based voice application
- Modern UI with Tailwind CSS
- Voice synthesis interface
- Real-time voice generation
- Download functionality

**Files created:**
```
my-app/
├── package.json
├── public/
│   └── index.html
├── src/
│   ├── App.js
│   ├── App.css
│   └── index.js
└── README.md
```

### **3. Python Voice Bot Template**
```bash
eleven init my-bot --template python-voice
```

**What you get:**
- Flask-based voice bot
- REST API endpoints
- Voice synthesis service
- Background processing
- Health monitoring

**Files created:**
```
my-bot/
├── app.py
├── requirements.txt
├── templates/
│   └── index.html
└── README.md
```

---

## 🎧 **Voice Features**

### **Voice Synthesis**

**Basic Usage:**
```bash
eleven test --text "Hello, world!"
```

**With Custom Voice:**
```bash
eleven test --text "Hello!" --voice EXAVITQu4vr4xnSDxMaL
```

**Batch Processing:**
```bash
# Create sentences file
echo "Hello world" > sentences.txt
echo "How are you?" >> sentences.txt

# Process batch
eleven test --batch --file sentences.txt
```

### **Voice Cloning**

**Interactive Cloning:**
```bash
eleven clone --interactive
```

**From Audio File:**
```bash
eleven clone --file sample.wav --name "My Voice"
```

**Supported Audio Formats:**
- MP3
- WAV
- M4A
- AAC
- OGG

### **Voice Analysis**

**Quality Analysis:**
```bash
eleven analyze --voice EXAVITQu4vr4xnSDxMaL
```

**With Sample Text:**
```bash
eleven analyze --voice EXAVITQu4vr4xnSDxMaL --text "Sample text for analysis"
```

**Analysis Metrics:**
- Clarity score
- Naturalness rating
- Emotion detection
- Pronunciation accuracy
- Overall quality score

### **Voice Tuning**

**Interactive Tuning:**
```bash
eleven tune --interactive
```

**Parameter Tuning:**
```bash
eleven tune --stability 0.8 --similarity 0.9 --style 0.2
```

**Available Parameters:**
- **Stability** (0-1): Voice consistency
- **Similarity** (0-1): Voice similarity to original
- **Style** (0-1): Voice style variation
- **Speaker Boost**: Enhanced speaker clarity

---

## 🔧 **Advanced Features**

### **Plugin System**

**List Plugins:**
```bash
eleven advanced --list-plugins
```

**Install Plugin:**
```bash
eleven advanced --install-plugin plugin-name
```

**Uninstall Plugin:**
```bash
eleven advanced --uninstall-plugin plugin-name
```

### **Analytics Dashboard**

**View Analytics:**
```bash
eleven advanced --analytics
```

**Analytics Include:**
- Command usage statistics
- Performance metrics
- Error tracking
- Session information
- Feature usage patterns

### **Performance Monitoring**

**Performance Dashboard:**
```bash
eleven advanced --performance
```

**Metrics Include:**
- Cache hit rates
- API response times
- Memory usage
- CPU utilization
- Network performance

### **System Optimization**

**Optimize System:**
```bash
eleven advanced --optimize
```

**Optimization Includes:**
- Cache cleanup
- Temporary file removal
- Memory optimization
- Performance tuning

---

## 💡 **Examples & Use Cases**

### **1. Voice Assistant Development**

```bash
# Create voice assistant project
eleven init my-assistant --template voice-agent

# Test different voices
eleven test --text "Hello, I'm your voice assistant" --voice EXAVITQu4vr4xnSDxMaL
eleven test --text "How can I help you today?" --voice 21m00Tcm4TlvDq8ikWAM

# Clone your own voice
eleven clone --file my-voice-sample.wav --name "Assistant Voice"
```

### **2. E-Learning Platform**

```bash
# Create React-based learning app
eleven init learning-app --template react-voice

# Generate course content
eleven docs --ai --project

# Test educational content
eleven test --text "Welcome to our course on machine learning"
```

### **3. Customer Service Bot**

```bash
# Create Python voice bot
eleven init support-bot --template python-voice

# Test customer service phrases
eleven test --text "Thank you for calling, how can I help you?"
eleven test --text "I understand your concern, let me help you with that"
```

### **4. Podcast Production**

```bash
# Create podcast project
eleven init my-podcast --template voice-agent

# Generate episode scripts
eleven docs --ai --project

# Test different voices for segments
eleven test --text "Welcome to today's episode" --voice EXAVITQu4vr4xnSDxMaL
eleven test --text "Let's hear from our guest" --voice 21m00Tcm4TlvDq8ikWAM
```

### **5. Accessibility Features**

```bash
# Create accessibility app
eleven init accessibility-app --template react-voice

# Test screen reader content
eleven test --text "The weather today is sunny with a high of 75 degrees"
eleven test --text "You have 3 new messages in your inbox"
```

---

## 🎯 **Tips & Best Practices**

### **Voice Selection**

**Choose the Right Voice:**
- **Professional**: Use for business applications
- **Friendly**: Use for customer service
- **Authoritative**: Use for news or announcements
- **Calm**: Use for meditation or relaxation apps

### **Text Preparation**

**Optimize Your Text:**
- Use clear, simple language
- Avoid complex technical terms
- Add punctuation for natural pauses
- Break long sentences into shorter ones

### **Performance Optimization**

**Improve Performance:**
- Use caching for repeated requests
- Batch process multiple texts
- Optimize voice parameters
- Monitor system resources

### **Error Handling**

**Handle Errors Gracefully:**
- Check API connectivity before processing
- Implement retry logic for failed requests
- Provide user-friendly error messages
- Log errors for debugging

### **Security Best Practices**

**Keep Your Data Secure:**
- Store API keys in environment variables
- Use secure file permissions
- Rotate API keys regularly
- Monitor usage and access

---

## ❓ **FAQ**

### **General Questions**

**Q: What is Eleven-Cursor?**
A: Eleven-Cursor is a CLI tool that makes it easy to build voice applications using ElevenLabs' text-to-speech technology.

**Q: Do I need programming experience?**
A: Basic command-line knowledge is helpful, but the tool is designed to be user-friendly for all skill levels.

**Q: Is it free to use?**
A: The CLI tool is free, but you'll need an ElevenLabs API key for voice synthesis (they have a free tier).

### **Installation Questions**

**Q: How do I install Eleven-Cursor?**
A: Run `npm install -g eleven-cli` to install globally.

**Q: I get "command not found" error.**
A: Make sure you've installed it globally or use `npx eleven` instead.

**Q: Do I need Node.js?**
A: Yes, you need Node.js 16.0.0 or higher.

### **API Questions**

**Q: How do I get an ElevenLabs API key?**
A: Sign up at [elevenlabs.io](https://elevenlabs.io) and get your API key from the dashboard.

**Q: What voices are available?**
A: ElevenLabs provides several pre-made voices, and you can also clone your own voice.

**Q: Is there a rate limit?**
A: Yes, ElevenLabs has rate limits based on your plan. The CLI handles this automatically.

### **Usage Questions**

**Q: How do I create a new project?**
A: Use `eleven init project-name` to create a new voice agent project.

**Q: How do I test voice synthesis?**
A: Use `eleven test --text "Your text here"` to test voice synthesis.

**Q: Can I use my own voice?**
A: Yes, use the `eleven clone` command to clone your voice from an audio sample.

### **Technical Questions**

**Q: What file formats are supported?**
A: The CLI supports MP3, WAV, M4A, AAC, and OGG audio formats.

**Q: How do I debug issues?**
A: Use `eleven --debug` or `eleven --verbose` for detailed output.

**Q: Can I extend the functionality?**
A: Yes, the CLI has a plugin system for adding custom features.

---

## 🎉 **You're All Set!**

You now have everything you need to start building amazing voice applications with Eleven-Cursor! The tool is designed to be intuitive and powerful, making voice development accessible to everyone.

**Happy voice building!** 🎧✨

---

*For more help, visit our [GitHub repository](https://github.com/silver-team/eleven-cli) or join our [Discord community](https://discord.gg/eleven-cli).*