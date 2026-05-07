import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('SARVAM_API_KEY')

print("Testing Translate...")
try:
    resp = requests.post('https://api.sarvam.ai/translate', headers={'api-subscription-key': api_key}, json={'input': 'Hello', 'source_language_code': 'en-IN', 'target_language_code': 'kn-IN'})
    print('Translate:', resp.status_code, resp.text)
except Exception as e:
    print(e)

print("Testing Doc Parse...")
try:
    with open(__file__, 'rb') as f:
        # Just sending the python script itself to see what it complains about or if it accepts it
        resp = requests.post('https://api.sarvam.ai/doc-parse', headers={'api-subscription-key': api_key}, files={'file': ('test.txt', f, 'text/plain')})
        print('Doc-parse:', resp.status_code, resp.text)
except Exception as e:
    print(e)
