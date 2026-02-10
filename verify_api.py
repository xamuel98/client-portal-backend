import json
import subprocess
import time
import sys
import uuid

BASE_URL = "http://localhost:3000/api/v1"
TOKEN = None
TENANT_ID = None
USER_ID = None
PROJECT_ID = None
TASK_ID = None
INVOICE_ID = None
MESSAGE_ID = None
FILE_ID = None
INVITATION_ID = None
NOTIFICATION_ID = None

def run_request(method, endpoint, data=None, include_token=True):
    url = f"{BASE_URL}{endpoint}"
    # Use |SEP| as a separator
    cmd = ["curl", "-s", "-w", "|SEP|%{http_code}", "-X", method, url]
    cmd.extend(["-H", "Content-Type: application/json"])
    
    if include_token and TOKEN:
        cmd.extend(["-H", f"Authorization: Bearer {TOKEN}"])
    
    input_data = None
    if data:
        cmd.extend(["-d", "@-"])
        input_data = json.dumps(data)

    try:
        result = subprocess.run(cmd, input=input_data, capture_output=True, text=True)
        output = result.stdout
        if not output:
            return 0, {}
            
        parts = output.rsplit('|SEP|', 1)
        if len(parts) < 2:
            return 0, {"raw": output}
            
        body_str = parts[0]
        status_str = parts[1].strip()
        
        try:
            status = int(status_str)
        except:
            status = 0
            
        try:
            body = json.loads(body_str) if body_str.strip() else {}
        except:
            body = {"raw": body_str}
        return status, body
    except Exception as e:
        print(f"Error: {e}")
        return 0, {"error": str(e)}

def test_module(name):
    print(f"\n--- Testing Module: {name} ---")

def assert_status(status, expected, name, body=None):
    expected_list = expected if isinstance(expected, (list, tuple)) else [expected]
    if status in expected_list:
        print(f"  [PASS] {name} (Status: {status})")
        return True
    else:
        print(f"  [FAIL] {name} (Status: {status}, Expected: {expected})")
        if body:
            print(f"    Response Body: {json.dumps(body, indent=2)}")
        return False

# 1. Health & Info
test_module("System")
s, b = run_request("GET", "/health", include_token=False)
assert_status(s, 200, "GET /health", b)
s, b = run_request("GET", "/info", include_token=False)
assert_status(s, 200, "GET /info", b)

# 2. Auth
test_module("Auth")
email = f"tester-{uuid.uuid4().hex[:8]}@example.com"
reg_data = {
    "email": email,
    "password": "Password123!",
    "firstName": "Curl",
    "lastName": "Tester",
    "tenantName": f"Tenant-{uuid.uuid4().hex[:4]}"
}
s, b = run_request("POST", "/auth/register", data=reg_data, include_token=False)
if assert_status(s, 201, "POST /auth/register", b):
    print(f"    Registered: {email}")

# Login (Expected 200)
login_data = {"email": email, "password": "Password123!"}
s, b = run_request("POST", "/auth/login", data=login_data, include_token=False)
if assert_status(s, 200, "POST /auth/login", b):
    TOKEN = b.get("data", {}).get("accessToken")
    USER_ID = b.get("data", {}).get("user", {}).get("_id")
    TENANT_ID = b.get("data", {}).get("user", {}).get("tenantId")
    print(f"    Logged in. UserID: {USER_ID}")

# 3. Users
test_module("Users")
if TOKEN:
    s, b = run_request("GET", "/users/me")
    assert_status(s, 200, "GET /users/me", b)

# 4. Projects (Search & Pagination)
test_module("Projects")
if TOKEN:
    proj_data = {
        "name": "Project Alpha",
        "description": "Verification research",
        "clientName": "Global Corp"
    }
    s, b = run_request("POST", "/projects", data=proj_data)
    if assert_status(s, 201, "POST /projects", b):
        PROJECT_ID = b.get("data", {}).get("_id")

    # Test Search
    s, b = run_request("GET", "/projects?search=Alpha")
    if assert_status(s, 200, "GET /projects?search=Alpha", b):
        projs = b.get("data", [])
        if any(p.get("name") == "Project Alpha" for p in projs):
            print("    [PASS] Search found Project Alpha")

    # Test Pagination metadata
    if b.get("meta") and "total" in b["meta"]:
        print(f"    [PASS] Pagination meta found: total={b['meta']['total']}")

# 5. Tasks
test_module("Tasks")
if PROJECT_ID:
    task_data = {
        "title": "Verif Task",
        "projectId": PROJECT_ID,
        "priority": "medium"
    }
    s, b = run_request("POST", "/tasks", data=task_data)
    if assert_status(s, 201, "POST /tasks", b):
        TASK_ID = b.get("data", {}).get("_id")

if TASK_ID:
    s, b = run_request("GET", f"/tasks/{TASK_ID}")
    assert_status(s, 200, "GET /tasks/id", b)

# 6. Messages
test_module("Messages")
if PROJECT_ID:
    msg_data = {"content": "Verification message", "projectId": PROJECT_ID}
    s, b = run_request("POST", "/messages", data=msg_data)
    assert_status(s, 201, "POST /messages", b)

# 7. Analytics & Logs
test_module("Analytics & Logs")
if TOKEN:
    s, b = run_request("GET", "/analytics/dashboard")
    assert_status(s, 200, "GET /analytics/dashboard", b)
    s, b = run_request("GET", "/activity-logs/me")
    assert_status(s, 200, "GET /activity-logs/me", b)

# Cleanup
test_module("Cleanup")
if TASK_ID:
    s, b = run_request("DELETE", f"/tasks/{TASK_ID}")
    assert_status(s, 200, "DELETE /tasks/id", b)
if PROJECT_ID:
    s, b = run_request("DELETE", f"/projects/{PROJECT_ID}")
    assert_status(s, 200, "DELETE /projects/id", b)

print("\n--- Final Verification Complete ---")
