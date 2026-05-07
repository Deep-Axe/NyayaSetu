import requests
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('SARVAM_API_KEY')

print("Testing v1/documents/submit...")
try:
    with open(__file__, 'rb') as f:
        resp = requests.post('https://api.sarvam.ai/v1/documents/submit', headers={'api-subscription-key': api_key}, files={'file': ('test.txt', f, 'text/plain')})
        print('Doc-parse:', resp.status_code, resp.text)
except Exception as e:
    print(e)
