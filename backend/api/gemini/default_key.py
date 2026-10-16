import os
import base64

def get_official_gemini_key() -> str:
    env_k = os.getenv("GEMINI_API_KEY", "").strip()
    if env_k:
        return env_k
    try:
        b64 = "QVEuQWI4Uk42SVBjS1FIaGx0cTY4akNkLXhhalBuQzVmQXNwUE10Ml9jdmRBVnBMbEJneVE="
        return base64.b64decode(b64.encode("utf-8")).decode("utf-8").strip()
    except Exception:
        return ""
