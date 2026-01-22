import requests
import json
import os

SUPABASE_URL = 'https://abafispmjdpryjkevath.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYWZpc3BtamRwcnlqa2V2YXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQ2NTY5MywiZXhwIjoyMDgzMDQxNjkzfQ.86C0pVyYqUSInbIpOD-Z7IZVyr3utniyht9WZx96M98'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

data = {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Test Business For Portal",
    "owner_name": "Test Owner",
    "email": "test@tradescaptain.com",
    "phone": "+15550001111",
    "plan_tier": "starter"
}

print("Creating test business...")
response = requests.post(f'{SUPABASE_URL}/rest/v1/businesses', headers=headers, json=data)

if response.status_code == 201:
    print("Success:", response.json())
else:
    print("Error:", response.status_code, response.text)
