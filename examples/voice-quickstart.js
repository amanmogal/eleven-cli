#!/usr/bin/env node

/**
 * Voice Project Quick Start
 * Simple example showing basic voice functionality
 */

const VoiceProject = require('../src/voice');
const path = require('path');

async function quickStart() {
  console.log('🎤 Voice Project Quick Start\n');
  
  // Check for API key
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('❌ Please set ELEVENLABS_API_KEY environment variable');
    console.log('   export ELEVENLABS_API_KEY="your_api_key_here"');
    process.exit(1);
  }
  
  try {
    // Initialize voice project
    console.log('1. Initializing voice project...');
    const voiceProject = new VoiceProject({
      apiKey: process.env.ELEVENLABS_API_KEY,
      outputDir: './quickstart-output'
    });
    
    await voiceProject.initialize();
    console.log('✅ Voice project ready\n');
    
    // Get available voices
    console.log('2. Fetching available voices...');
    const voices = await voiceProject.getVoices();
    console.log(`✅ Found ${voices.length} voices\n`);
    
    // Basic synthesis
    console.log('3. Synthesizing text to speech...');
    const text = 'Hello! This is a quick start demonstration of the voice project.';
    const audioPath = await voiceProject.synthesizeToFile(
      text,
      './quickstart-output/hello.mp3'
    );
    console.log(`✅ Audio saved to: ${audioPath}\n`);
    
    // Voice selection demo
    console.log('4. Voice selection demo...');
    if (voices.length > 1) {
      const selectedVoice = voices[1];
      const customText = 'This is using a different voice for variety.';
      
      const customAudioPath = await voiceProject.synthesizeToFile(
        customText,
        './quickstart-output/custom-voice.mp3',
        { voiceId: selectedVoice.voice_id }
      );
      console.log(`✅ Custom voice audio saved to: ${customAudioPath}\n`);
    }
    
    // Batch processing demo
    console.log('5. Batch processing demo...');
    const batchTexts = [
      'First batch item.',
      'Second batch item.',
      'Third batch item.'
    ];
    
    const batchResults = await voiceProject.batchProcess(batchTexts);
    console.log(`✅ Batch processed ${batchResults.length} texts\n`);
    
    // Show results
    console.log('🎉 Quick start complete!');
    console.log('\nGenerated files:');
    const fs = require('fs-extra');
    const outputDir = './quickstart-output';
    if (await fs.pathExists(outputDir)) {
      const files = await fs.readdir(outputDir);
      files.forEach(file => {
        console.log(`  - ${file}`);
      });
    }
    
    console.log('\nNext steps:');
    console.log('  - Try: eleven voice interactive');
    console.log('  - Run: eleven voice --help');
    console.log('  - Explore: eleven voice synthesize -t "Your text here"');
    
  } catch (error) {
    console.error('❌ Quick start failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  quickStart().catch(console.error);
}

module.exports = quickStart;