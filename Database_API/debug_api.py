
import uvicorn
import main

if __name__ == "__main__":
    try:
        print("Starting uvicorn...")
        uvicorn.run(main.app, host="127.0.0.1", port=8000, log_level="debug")
    except Exception as e:
        import traceback
        print("Caught exception:")
        traceback.print_exc()
