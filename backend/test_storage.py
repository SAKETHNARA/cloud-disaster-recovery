# test_storage.py
# Run this ONCE to prove that upload, download and delete work
# on the real cloud bucket. It is only a test, not part of the app.

from datetime import datetime
from supabase_client import supabase

BUCKET = "backups"
TEST_PATH = "test/hello.txt"

bucket = supabase.storage.from_(BUCKET)

# 1. UPLOAD a small text file to the cloud
content = f"Hello from Cloud DR project! Uploaded at {datetime.now()}".encode("utf-8")
bucket.upload(
    path=TEST_PATH,
    file=content,
    file_options={"content-type": "text/plain", "upsert": "true"},
)
print("1. Upload successful:", TEST_PATH)

# 2. LIST files inside the 'test' folder
files = bucket.list("test")
print("2. Files in cloud folder 'test':", [f["name"] for f in files])

# 3. DOWNLOAD the file back and read its content
downloaded = bucket.download(TEST_PATH)
print("3. Downloaded content:", downloaded.decode("utf-8"))

# 4. DELETE the test file (clean up)
bucket.remove([TEST_PATH])
print("4. Test file deleted from cloud")

print("\nAll storage operations worked. Cloud storage is ready!")