import os
import re

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements
    # 1. cardTitle -> tareaTitle, cardKey -> tareaKey, etc. (camelCase)
    content = re.sub(r'([cC])ard', lambda m: 't' + 'area' if m.group(1) == 'c' else 'T' + 'area', content)
    
    # 2. UPPERCASE (if any)
    content = re.sub(r'CARD', 'TAREA', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def walk_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js'):
                replace_in_file(os.path.join(root, file))

walk_dir('src/')
