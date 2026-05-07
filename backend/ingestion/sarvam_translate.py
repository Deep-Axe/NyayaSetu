from sarvamai import SarvamAI
from backend.config import SARVAM_API_KEY

client = SarvamAI(api_subscription_key=SARVAM_API_KEY)

def translate_to_english(text, source='kn-IN'):
    """
    Translates text from source language (default Kannada) to English using Sarvam Translate API via SDK.
    """
    try:
        response = client.text.translate(
            input=text,
            source_language_code=source,
            target_language_code="en-IN",
            model="sarvam-translate:v1"
        )
        return response.translated_text
    except Exception as e:
        print(f"Translation failed: {e}")
        return text

# Local override lookup as suggested in roadmap
LOOKUP_TABLE = {
    'ಲೋಕೋಪಯೋಗಿ ಇಲಾಖೆ': 'Public Works Department',
    'ರಾಜಸ್ವ ಇಲಾಖೆ': 'Revenue Department'
}

def translate_with_lookup(text, source='kn-IN'):
    if text in LOOKUP_TABLE:
        return LOOKUP_TABLE[text]
    return translate_to_english(text, source)
