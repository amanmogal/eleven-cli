const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test utilities
const { promisify } = require('util');
const execAsync = promisify(exec);

describe('Eleven-Cursor CLI', () => {
  const cliPath = path.join(__dirname, '../bin/index.js');

  beforeAll(() => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.DEBUG = 'false';
  });

  afterAll(() => {
    // Clean up test files
    const testProjectPath = path.join(__dirname, '../test-voice-agent');
    if (fs.existsSync(testProjectPath)) {
      fs.rmSync(testProjectPath, { recursive: true, force: true });
    }
  });

  describe('Help Command', () => {
    test('should display help information', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} --help`);
      
      expect(stdout).toContain('eleven-cursor');
      expect(stdout).toContain('Commands:');
      expect(stdout).toContain('init');
      expect(stdout).toContain('test');
      expect(stdout).toContain('docs');
      expect(stdout).toContain('tune');
    });
  });

  describe('Version Command', () => {
    test('should display version information', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} --version`);
      
      expect(stdout).toContain('0.1.0');
    });
  });

  describe('Init Command', () => {
    const testProjectName = 'test-voice-agent';

    afterEach(() => {
      // Clean up test project after each test
      const projectPath = path.join(__dirname, '..', testProjectName);
      if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true });
      }
    });

    test('should create project with default options', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} init ${testProjectName} --yes`);
      
      expect(stdout).toContain('Project "test-voice-agent" created successfully');
      
      // Check if project files were created
      const projectPath = path.join(__dirname, '..', testProjectName);
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src/index.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, '.env.example'))).toBe(true);
    }, 15000);

    test('should fail if project already exists', async () => {
      // Ensure project doesn't exist first
      const projectPath = path.join(__dirname, '..', testProjectName);
      if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true });
      }
      
      // Create project first time
      await execAsync(`node ${cliPath} init ${testProjectName} --yes`);
      
      // Try to create again (should fail)
      try {
        await execAsync(`node ${cliPath} init ${testProjectName} --yes`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.stderr).toContain('already exists!');
      }
    }, 10000);
  });

  describe('Test Command', () => {
    test('should show help for test command', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} test --help`);
      
      expect(stdout).toContain('Test TTS');
      expect(stdout).toContain('--text');
      expect(stdout).toContain('--voice');
      expect(stdout).toContain('--output');
    });
  });

  describe('Docs Command', () => {
    test('should show help for docs command', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} docs --help`);
      
      expect(stdout).toContain('Generate README');
      expect(stdout).toContain('--file');
      expect(stdout).toContain('--output');
    });
  });

  describe('Tune Command', () => {
    test('should show help for tune command', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} tune --help`);
      
      expect(stdout).toContain('Suggest voice settings');
      expect(stdout).toContain('--interactive');
      expect(stdout).toContain('--stability');
    });
  });

  describe('Config Command', () => {
    test('should show help for config command', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} config --help`);
      
      expect(stdout).toContain('Manage configuration');
      expect(stdout).toContain('--show');
      expect(stdout).toContain('--set');
    });
  });

  describe('Status Command', () => {
    test('should show help for status command', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} status --help`);
      
      expect(stdout).toContain('Show application status');
      expect(stdout).toContain('--api');
      expect(stdout).toContain('--cursor');
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown commands gracefully', async () => {
      try {
        await execAsync(`node ${cliPath} unknown-command`);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.stderr).toContain('Invalid command');
        expect(error.stderr).toContain('--help');
      }
    });

    test('should show help when no command provided', async () => {
      try {
        const { stdout, stderr } = await execAsync(`node ${cliPath}`);
        expect(stdout).toContain('eleven-cursor');
        expect(stdout).toContain('Commands:');
      } catch (error) {
        // The CLI exits with code 1 but shows help, so check stderr for the help content
        expect(error.stderr).toContain('eleven-cursor');
        expect(error.stderr).toContain('Commands:');
      }
    });
  });

  describe('Global Options', () => {
    test('should handle verbose flag', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} --verbose --help`);
      
      expect(stdout).toContain('eleven-cursor');
    });

    test('should handle debug flag', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} --debug --help`);
      
      expect(stdout).toContain('eleven-cursor');
    });

    test('should handle silent flag', async () => {
      const { stdout, stderr } = await execAsync(`node ${cliPath} --silent --help`);
      
      expect(stdout).toContain('eleven-cursor');
    }, 10000);
  });
});