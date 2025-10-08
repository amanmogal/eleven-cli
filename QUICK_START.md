# ⚡ Eleven-Cursor CLI - Quick Start Guide

## 🚀 **Get Up and Running in 5 Minutes**

### **Step 1: Install**
```bash
npm install -g eleven-cli
```

### **Step 2: Get API Key**
1. Go to [ElevenLabs](https://elevenlabs.io)
2. Sign up and get your API key
3. Set it:
```bash
export ELEVEN_API_KEY=your_api_key_here
```

### **Step 3: Create Project**
```bash
eleven init my-voice-agent
cd my-voice-agent
```

### **Step 4: Test Voice**
```bash
eleven test --text "Hello, world!"
```

**🎉 Done! You're building voice applications!**

---

## 🎯 **Essential Commands**

### **Create Projects**
```bash
eleven init my-project                    # Basic project
eleven init my-app --template react-voice # React app
eleven init my-bot --template python-voice # Python bot
```

### **Test Voice Synthesis**
```bash
eleven test --text "Your text here"      # Basic test
eleven test --interactive                # Interactive mode
eleven test --voice EXAVITQu4vr4xnSDxMaL # Specific voice
```

### **Clone Your Voice**
```bash
eleven clone --interactive               # Interactive cloning
eleven clone --file sample.wav --name "My Voice"
```

### **Analyze Voice Quality**
```bash
eleven analyze --voice EXAVITQu4vr4xnSDxMaL
eleven analyze --interactive
```

### **Generate Documentation**
```bash
eleven docs --project                    # Project docs
eleven docs --ai --project              # AI-powered docs
```

---

## 🏗️ **Project Templates**

| Template | Description | Use Case |
|----------|-------------|----------|
| `voice-agent` | Basic Node.js voice agent | Simple voice apps |
| `react-voice` | React voice application | Web voice apps |
| `python-voice` | Python Flask voice bot | API voice services |

---

## 🔧 **Configuration**

### **Environment Variables**
```bash
export ELEVEN_API_KEY=your_key_here
export DEFAULT_VOICE_ID=EXAVITQu4vr4xnSDxMaL
export DEBUG=false
```

### **Configuration File**
```bash
eleven config --show                    # Show current config
eleven config --set key value          # Set configuration
eleven config --interactive            # Interactive setup
```

---

## 🎧 **Voice Features**

### **Available Voices**
- **EXAVITQu4vr4xnSDxMaL** - Professional male
- **21m00Tcm4TlvDq8ikWAM** - Professional female
- **AZnzlk1XvdvUeBnXmlld** - Calm male
- **EXAVITQu4vr4xnSDxMaL** - Authoritative male

### **Voice Parameters**
- **Stability** (0-1): Voice consistency
- **Similarity** (0-1): Voice similarity to original
- **Style** (0-1): Voice style variation

### **Supported Audio Formats**
- MP3, WAV, M4A, AAC, OGG

---

## 🚀 **Advanced Features**

### **Performance Dashboard**
```bash
eleven advanced --performance
```

### **Analytics**
```bash
eleven advanced --analytics
```

### **System Health**
```bash
eleven status
eleven advanced --health
```

### **Plugin Management**
```bash
eleven advanced --plugins
eleven advanced --list-plugins
```

---

## 🛠️ **Troubleshooting**

### **Common Issues**

**"Command not found"**
```bash
# Use npx if not installed globally
npx eleven --help
```

**"Invalid API key"**
```bash
# Check your API key
echo $ELEVEN_API_KEY
export ELEVEN_API_KEY=your_correct_key
```

**"Network timeout"**
```bash
# Check API status
eleven status --api
```

### **Debug Mode**
```bash
eleven --debug test --text "Hello"
eleven --verbose test --text "Hello"
```

---

## 📚 **Next Steps**

1. **Read the [Complete User Guide](./USER_GUIDE.md)** for detailed usage
2. **Check the [Deployment Guide](./DEPLOYMENT_GUIDE.md)** for production setup
3. **Explore [Examples](./examples/)** for inspiration
4. **Join our [Discord community](https://discord.gg/eleven-cli)** for support

---

## 🎉 **You're Ready!**

You now have everything you need to start building amazing voice applications. The CLI is designed to be intuitive and powerful, making voice development accessible to everyone.

**Happy voice building!** 🎧✨