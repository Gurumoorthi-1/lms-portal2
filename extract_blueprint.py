import json
import os

log_path = r'C:\Users\Guru\.gemini\antigravity\brain\57b80c0f-84e4-4450-835e-ffd6a6124dee\.system_generated\logs\overview.txt'

with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    # Line 7 (index 6) is the one we want
    data = json.loads(lines[6])
    content = data.get('content', '')
    
    with open('blueprint_full.md', 'w', encoding='utf-8') as out:
        out.write(content)
