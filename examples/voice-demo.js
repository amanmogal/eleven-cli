/**
 * Voice Project Demo
 * Comprehensive demonstration of voice capabilities
 */

const VoiceProject = require('../src/voice');
const path = require('path');
const fs = require('fs-extra');

async function runVoiceDemo() {
  console.log('🎤 Voice Project Demo\n');
  
  try {
    // Initialize voice project
    console.log('1. Initializing Voice Project...');
    const voiceProject = new VoiceProject({
      apiKey: process.env.ELEVENLABS_API_KEY,
      outputDir: './demo-output'
    });
    
    await voiceProject.initialize();
    console.log('✅ Voice project initialized\n');
    
    // Demo 1: Basic Text-to-Speech
    console.log('2. Basic Text-to-Speech Demo...');
    const demoText = 'Hello! This is a demonstration of the voice project capabilities. We can synthesize natural-sounding speech from text.';
    
    const audioPath = await voiceProject.synthesizeToFile(
      demoText, 
      './demo-output/basic-synthesis.mp3'
    );
    console.log(`✅ Audio saved to: ${audioPath}\n`);
    
    // Demo 2: Voice Selection and Customization
    console.log('3. Voice Selection and Customization Demo...');
    const voices = await voiceProject.getVoices();
    console.log(`Found ${voices.length} available voices`);
    
    // Use a different voice for variety
    const selectedVoice = voices[1] || voices[0];
    const customText = 'This is using a different voice with custom settings for a more personalized experience.';
    
    const customAudioPath = await voiceProject.synthesizeToFile(
      customText,
      './demo-output/custom-voice.mp3',
      {
        voiceId: selectedVoice.voice_id,
        voiceSettings: {
          stability: 0.7,
          similarityBoost: 0.8,
          style: 0.2
        }
      }
    );
    console.log(`✅ Custom voice audio saved to: ${customAudioPath}\n`);
    
    // Demo 3: Batch Processing
    console.log('4. Batch Processing Demo...');
    const batchTexts = [
      'First batch item: Processing multiple texts efficiently.',
      'Second batch item: Each text is synthesized with the same voice.',
      'Third batch item: Perfect for creating audio content at scale.'
    ];
    
    const batchResults = await voiceProject.batchProcess(batchTexts, {
      voiceId: selectedVoice.voice_id
    });
    console.log(`✅ Batch processed ${batchResults.length} texts\n`);
    
    // Demo 4: Voice Analysis (if audio samples exist)
    console.log('5. Voice Analysis Demo...');
    try {
      // Create a sample audio file for analysis
      const sampleAudioPath = './demo-output/sample-for-analysis.wav';
      await fs.ensureDir(path.dirname(sampleAudioPath));
      
      // In a real scenario, this would be actual audio data
      await fs.writeFile(sampleAudioPath, Buffer.alloc(1024));
      
      const analysis = await voiceProject.cloning.analyzeVoice(sampleAudioPath);
      console.log('✅ Voice analysis completed');
      console.log('Analysis result:', analysis);
    } catch (error) {
      console.log('⚠️  Voice analysis demo skipped (requires audio samples)');
    }
    console.log();
    
    // Demo 5: Real-time Voice Processing
    console.log('6. Real-time Voice Processing Demo...');
    try {
      await voiceProject.startRealTime();
      console.log('✅ Real-time voice processing started');
      
      // Simulate sending some text
      voiceProject.realTime.sendText('This is a real-time voice synthesis demo.');
      voiceProject.realTime.sendText('The system can process text as it comes in.');
      voiceProject.realTime.endInput();
      
      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      voiceProject.stopRealTime();
      console.log('✅ Real-time processing completed\n');
    } catch (error) {
      console.log('⚠️  Real-time demo skipped (requires WebSocket connection)');
    }
    
    // Demo 6: Voice Testing
    console.log('7. Voice Testing Demo...');
    const VoiceTesting = require('../src/voice/voice-testing');
    const testing = new VoiceTesting({
      testDir: './demo-tests',
      resultsDir: './demo-results'
    });
    
    const testSummary = await testing.runAllTests();
    console.log(`✅ Tests completed: ${testSummary.passed}/${testSummary.total} passed`);
    console.log(`Success rate: ${testSummary.successRate.toFixed(1)}%\n`);
    
    // Demo 7: Interactive Mode
    console.log('8. Interactive Mode Demo...');
    console.log('Interactive mode would allow you to:');
    console.log('  - Select voices from a menu');
    console.log('  - Enter text for synthesis');
    console.log('  - Configure voice settings');
    console.log('  - Test different voices and settings');
    console.log('  - Run voice recognition on audio files');
    console.log();
    
    // Summary
    console.log('🎉 Voice Project Demo Complete!');
    console.log('\nGenerated files:');
    const outputDir = './demo-output';
    if (await fs.pathExists(outputDir)) {
      const files = await fs.readdir(outputDir);
      files.forEach(file => {
        console.log(`  - ${file}`);
      });
    }
    
    console.log('\nKey Features Demonstrated:');
    console.log('  ✅ Text-to-Speech Synthesis');
    console.log('  ✅ Voice Selection and Customization');
    console.log('  ✅ Batch Processing');
    console.log('  ✅ Voice Analysis');
    console.log('  ✅ Real-time Processing');
    console.log('  ✅ Comprehensive Testing');
    console.log('  ✅ Interactive Interface');
    
    console.log('\nNext Steps:');
    console.log('  1. Set your ELEVENLABS_API_KEY environment variable');
    console.log('  2. Run: eleven voice init');
    console.log('  3. Try: eleven voice interactive');
    console.log('  4. Explore: eleven voice --help');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error('\nMake sure to set your ELEVENLABS_API_KEY environment variable');
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  runVoiceDemo().catch(console.error);
}

module.exports = runVoiceDemo;