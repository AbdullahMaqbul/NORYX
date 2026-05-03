from fastapi.testclient import TestClient
from main import app
import os

client = TestClient(app)

def test_read_main():
    response = client.get("/controls/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_control():
    response = client.post(
        "/controls/",
        json={"name": "Test Control", "description": "Test Desc", "criteria": "password,policy"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Control"
    assert data["criteria"] == "password,policy"
    assert "id" in data

def test_upload_evidence():
    # First create a control
    control_response = client.post(
        "/controls/",
        json={"name": "Evidence Test", "description": "", "criteria": "test"}
    )
    control_id = control_response.json()["id"]

    # Create a dummy image file for testing
    with open("dummy_test_image.jpg", "wb") as f:
        f.write(b"fake image data")

    with open("dummy_test_image.jpg", "rb") as f:
        response = client.post(
            "/evidence/upload/",
            data={"control_id": control_id},
            files={"file": ("dummy_test_image.jpg", f, "image/jpeg")}
        )
    
    # Cleanup
    if os.path.exists("dummy_test_image.jpg"):
        os.remove("dummy_test_image.jpg")
    
    # Check response (it will try to run EasyOCR, which will fail on fake image, but API shouldn't crash 500)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["message"] == "File uploaded and validated"
