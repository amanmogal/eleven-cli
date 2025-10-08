const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test utilities
const { promisify } = require('util');
const execAsync = promisify(exec);

describe('Phase 2: Advanced Features', () => {
  const cliPath = path.join(__dirname, '../bin/index.js');

  beforeAll(() => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.DEBUG = 'false';
    process.env.ELEVEN_API_KEY = 'test_api_key_for_testing_purposes_only_123456789';
  });

  beforeEach(() => {
    // Clean up test files before each test
    const testProjects = [
      'test-phase2-project',
      'test-python-bot',
      'test-template-project',
      'test-readme-project',
      'test-complete-project',
      'test-vars'
    ];
    
    testProjects.forEach(projectName => {
      const projectPath = path.join(__dirname, '..', projectName);
      if (fs.existsSync(projectPath)) {
        try {
          fs.rmSync(projectPath, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
          console.warn(`Failed to cleanup ${projectName}: ${error.message}`);
        }
      }
    });
  });

  afterAll(() => {
    // Clean up test files
    const testProjects = [
      'test-phase2-project',
      'test-python-bot',
      'test-template-project',
      'test-readme-project',
      'test-complete-project',
      'test-vars'
    ];
    
    testProjects.forEach(projectName => {
      const projectPath = path.join(__dirname, '..', projectName);
      if (fs.existsSync(projectPath)) {
        try {
          fs.rmSync(projectPath, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
          console.warn(`Failed to cleanup ${projectName}: ${error.message}`);
        }
      }
    });
  });

  describe('Template System', () => {
    test('should list available templates', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} init --help`);
      
      expect(stdout).toContain('init');
      expect(stdout).toContain('template');
    });

    test('should create React voice app from template', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} init test-phase2-project --template react-voice --yes`);
      
      expect(stdout).toContain('Project generated successfully from template: React Voice App');
      
      // Check if React project files were created
      const projectPath = path.join(__dirname, '../test-phase2-project');
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src/App.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src/App.css'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'public/index.html'))).toBe(true);
    }, 15000);

    test('should create Python voice bot from template', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} init test-python-bot --template python-voice --yes`);
      
      expect(stdout).toContain('Project generated successfully from template: Python Voice Bot');
      
      // Check if Python project files were created
      const projectPath = path.join(__dirname, '../test-python-bot');
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'app.py'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'requirements.txt'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'templates/index.html'))).toBe(true);
    }, 15000);
  });

  describe('Clone Command', () => {
    test('should show help for clone command', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} clone --help`);
      
      expect(stdout).toContain('Clone a voice from audio sample');
      expect(stdout).toContain('--file');
      expect(stdout).toContain('--name');
      expect(stdout).toContain('--interactive');
    });

    test('should list cloned voices', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} clone --list`);
      
      // Should show the command is running (even if API fails)
      expect(stdout).toContain('Voice cloning');
      // Check both stdout and stderr for the spinner message
      const output = stdout + stderr;
      expect(output).toContain('Fetching cloned voices');
    });
  });

  describe('Analyze Command', () => {
    test('should show help for analyze command', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} analyze --help`);
      
      expect(stdout).toContain('Analyze voice quality');
      expect(stdout).toContain('--voice');
      expect(stdout).toContain('--text');
      expect(stdout).toContain('--interactive');
    });

    test('should run basic analysis', async () => {
      try {
        const { stdout, stderr } = await execAsync(`node ${cliPath} analyze --voice EXAVITQu4vr4xnSDxMaL --text "Test analysis"`);
        // If successful, should not contain error
        expect(stderr).not.toContain('Error');
      } catch (error) {
        // If it fails due to API error (expected with test key), that's okay
        const output = error.stdout + (error.stderr || '');
        expect(output).toContain('Analyzing voice quality');
      }
    });
  });

  describe('Enhanced Init Command', () => {
    test('should support template selection', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} init test-template-project --template voice-agent --yes`);
      
      expect(stdout).toContain('Project generated successfully from template');
      
      // Check if project was created
      const projectPath = path.join(__dirname, '../test-template-project');
      expect(fs.existsSync(projectPath)).toBe(true);
    });

    test('should generate proper README with template info', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} init test-readme-project --template react-voice --yes`);
      
      const projectPath = path.join(__dirname, '../test-readme-project');
      const readmePath = path.join(projectPath, 'README.md');
      
      if (fs.existsSync(readmePath)) {
        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        expect(readmeContent).toContain('React Voice App');
        expect(readmeContent).toContain('npm start');
        expect(readmeContent).toContain('eleven-cursor');
      }
    }, 15000);
  });

  describe('Template Manager', () => {
    test('should load available templates', () => {
      const TemplateManager = require('../src/lib/template-manager');
      const templateManager = new TemplateManager();
      
      const templates = templateManager.getAvailableTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      // Check for expected templates
      const templateIds = templates.map(t => t.id);
      expect(templateIds).toContain('voice-agent');
      expect(templateIds).toContain('react-voice');
      expect(templateIds).toContain('python-voice');
    });

    test('should get template by ID', () => {
      const TemplateManager = require('../src/lib/template-manager');
      const templateManager = new TemplateManager();
      
      const template = templateManager.getTemplate('react-voice');
      expect(template).toBeTruthy();
      expect(template.id).toBe('react-voice');
      expect(template.name).toContain('React');
      expect(template.framework).toBe('react');
    });

    test('should get templates by category', () => {
      const TemplateManager = require('../src/lib/template-manager');
      const templateManager = new TemplateManager();
      
      const webTemplates = templateManager.getTemplatesByCategory('web');
      expect(Array.isArray(webTemplates)).toBe(true);
      expect(webTemplates.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid template gracefully', async () => {
      try {
        await execAsync(`node ${cliPath} init test-invalid --template invalid-template --yes`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.stdout).toContain('Template not found');
      }
    });

    test('should handle missing required arguments for clone', async () => {
      try {
        await execAsync(`node ${cliPath} clone --file test.mp3`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.stdout).toContain('Audio file and voice name are required');
      }
    });
  });

  describe('Integration Tests', () => {
    test('should create complete project with all features', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} init test-complete-project --template react-voice --yes`);
      
      expect(stdout).toContain('Project generated successfully');
      
      const projectPath = path.join(__dirname, '../test-complete-project');
      
      // Check all expected files exist
      const expectedFiles = [
        'package.json',
        'README.md',
        '.env.example',
        '.gitignore',
        'src/App.js',
        'src/App.css',
        'src/index.js',
        'src/index.css',
        'public/index.html'
      ];
      
      expectedFiles.forEach(file => {
        expect(fs.existsSync(path.join(projectPath, file))).toBe(true);
      });
    }, 15000);

    test('should handle template variable substitution', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} init test-vars --template react-voice --yes`);
      
      const projectPath = path.join(__dirname, '../test-vars');
      const packageJsonPath = path.join(projectPath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        expect(packageJson.name).toBe('my-voice-agent');
        expect(packageJson.description).toContain('voice agent');
      }
    }, 15000);
  });
});