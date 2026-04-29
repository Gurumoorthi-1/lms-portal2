const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Guru\\.gemini\\antigravity\\brain\\57b80c0f-84e4-4450-835e-ffd6a6124dee\\.system_generated\\logs\\overview.txt';

try {
    const data = fs.readFileSync(logPath, 'utf8');
    const lines = data.split('\n');
    const jsonLine = JSON.parse(lines[6]);
    const content = jsonLine.content;
    
    fs.writeFileSync('blueprint_full.md', content, 'utf8');
    console.log('Blueprint extracted successfully');
} catch (err) {
    console.error('Error:', err);
}
