import json

# Read the corrupted file
with open('results/amd-ryzen-9-5900x-12-core-processor/algorithmic.json', 'r') as f:
    content = f.read()

print('Content length:', len(content))
print('First 200 chars:', repr(content[:200]))

# Find the first good entry
start = content.find('{"input":"small"')
print('Start position:', start)

if start >= 0:
    good_content = content[start:]
    good_content = '[' + good_content
    print('Good content first 200:', repr(good_content[:200]))
    try:
        entries = json.loads(good_content)
        print(f'Found {len(entries)} good entries')
        with open('results/amd-ryzen-9-5900x-12-core-processor/algorithmic.json', 'w') as f:
            json.dump(entries, f, indent=2)
        print('Fixed JSON file')
    except Exception as e:
        print(f'JSON error: {e}')
else:
    print('No good entries found')