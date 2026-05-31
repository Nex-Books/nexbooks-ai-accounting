from dotenv import load_dotenv
load_dotenv()  # load .env before any service imports that read env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import chat, auth, transactions

app = FastAPI(
    title="NexBooks API",
    description="AI-Powered Accounting Platform for Indian Businesses",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(transactions.router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "app": "NexBooks"}
