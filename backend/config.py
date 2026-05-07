import os
from dotenv import load_dotenv

load_dotenv()

def get_env_var(var_name, default=None, required=True):
    value = os.getenv(var_name, default)
    if required and not value:
        raise ValueError(f"Missing required environment variable: {var_name}")
    return value

SARVAM_API_KEY = get_env_var("SARVAM_API_KEY")
AZURE_KEY_AI = get_env_var("AZURE_KEY_AI", required=False) # Fallback if needed
DATABASE_URL = get_env_var("DATABASE_URL", default="sqlite:///./test.db", required=False) # Fallback for easy testing
ACS_CONNECTION_STRING = get_env_var("ACS_CONNECTION_STRING")
ACS_SENDER_ADDRESS = get_env_var("ACS_SENDER_ADDRESS")
AZURE_EXISTING_AIPROJECT_ENDPOINT = get_env_var("AZURE_EXISTING_AIPROJECT_ENDPOINT")
_agent_id_raw = get_env_var("AZURE_EXISTING_AGENT_ID")  # format: "name:version"
AGENT_NAME, AGENT_VERSION = _agent_id_raw.split(":", 1)

# Add other config as needed
DEBUG = get_env_var("DEBUG", "False", required=False) == "True"
