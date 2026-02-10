import json
import subprocess
import time
import sys
import uuid

BASE_URL = "http://localhost:3000/api/v1"
TOKEN = None
USER_ID = None
TENANT_ID = None

def run_request(method, endpoint, data=None, include_token=True):
    url = f"{BASE_URL}{endpoint}"
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
        if not output: return 0, {}
        parts = output.rsplit('|SEP|', 1)
        if len(parts) < 2: return 0, {"raw": output}
        body_str, status_str = parts[0], parts[1].strip()
        status = int(status_str) if status_str.isdigit() else 0
        try:
            body = json.loads(body_str) if body_str.strip() else {}
        except:
            body = {"raw": body_str}
        return status, body
    except Exception as e:
        return 0, {"error": str(e)}

def test_step(name, status, expected_status, body=None):
    if status == expected_status:
        print(f"[PASS] {name} (Status: {status})")
        return True
    else:
        print(f"[FAIL] {name} (Status: {status}, Expected: {expected_status})")
        if body: print(f"Response: {json.dumps(body, indent=2)}")
        return False

# 1. Auth & User Info
print("--- 1. Auth & User Info ---")
email = f"approver-{uuid.uuid4().hex[:8]}@example.com"
reg_data = {"email": email, "password": "Password123!", "firstName": "Approve", "lastName": "Tester", "tenantName": f"Tenant-{uuid.uuid4().hex[:4]}"}
s, b = run_request("POST", "/auth/register", data=reg_data, include_token=False)
if test_step("Register", s, 201, b):
    s, b = run_request("POST", "/auth/login", data={"email": email, "password": "Password123!"}, include_token=False)
    if test_step("Login", s, 200, b):
        TOKEN = b.get("data", {}).get("accessToken")
        s, b = run_request("GET", "/users/me")
        if test_step("Get Me", s, 200, b):
            USER_ID = b.get("data", {}).get("_id")
            TENANT_ID = b.get("data", {}).get("tenantId")

def test_entity_approval(entity_type, create_endpoint, create_data, expected_status_after):
    print(f"\n--- Testing {entity_type} Approval ---")
    # 1. Create Entity
    s, b = run_request("POST", create_endpoint, data=create_data)
    if not test_step(f"Create {entity_type}", s, 201, b): return
    entity_id = b.get("data", {}).get("_id")
    
    # 2. Create Approval Request
    approval_data = {
        "approverId": USER_ID,
        "entityType": entity_type,
        "entityId": entity_id,
        "comments": f"Approve this {entity_type}"
    }
    s, b = run_request("POST", "/approval-requests", data=approval_data)
    if not test_step(f"Create Approval Req", s, 201, b): return
    req_id = b.get("data", {}).get("_id")
    
    # 3. Approve
    s, b = run_request("PATCH", f"/approval-requests/{req_id}/status", data={"status": "approved"})
    if not test_step(f"Approve Req", s, 200, b): return
    
    # 4. Verify
    s, b = run_request("GET", f"{create_endpoint}/{entity_id}")
    if test_step(f"Verify {entity_type} Status", s, 200, b):
        new_status = b.get("data", {}).get("status")
        if new_status == expected_status_after:
            print(f"[PASS] {entity_type} status updated to: {new_status}")
        else:
            print(f"[FAIL] {entity_type} status is: {new_status}, expected: {expected_status_after}")

if TOKEN and USER_ID:
    # Test Invoice
    test_entity_approval("invoice", "/invoices", {
        "clientId": USER_ID,
        "invoiceNumber": f"INV-{uuid.uuid4().hex[:6]}",
        "issueDate": "2024-02-01T00:00:00Z",
        "dueDate": "2024-03-01T00:00:00Z",
        "items": [{"description": "Service Alpha", "quantity": 1, "unitPrice": 5000}],
        "currency": "USD"
    }, "sent")
    
    # Create a Project for Task test
    s, b = run_request("POST", "/projects", data={"name": "Test Project"})
    project_id = b.get("data", {}).get("_id")
    
    # Test Project (Deliverable)
    test_entity_approval("project_deliverable", "/projects", {
        "name": f"Deliv-{uuid.uuid4().hex[:4]}",
        "description": "Test deliverable"
    }, "completed")

    # Test Task
    if project_id:
        test_entity_approval("task", "/tasks", {
            "projectId": project_id,
            "title": f"Task-{uuid.uuid4().hex[:4]}",
            "priority": "high"
        }, "done")

print("\n--- All Verifications Complete ---")
