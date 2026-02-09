
from fastapi import FastAPI
import uvicorn
import main # This will execute global code in main.py

app = main.app # Use the app from main.py

if __name__ == "__main__":
    print("Starting uvicorn on 8001...")
    uvicorn.run(app, host="127.0.0.1", port=8001)
