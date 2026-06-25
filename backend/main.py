from dotenv import load_dotenv
load_dotenv()  # load .env before any service imports that read env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import chat, auth, transactions, accounts, finance
from routers import ai as ai_router
from routers import journal as journal_router
from routers import bank as bank_router
from routers import parties as parties_router

app = FastAPI(
    title="NexBooks API",
    description="AI-Powered Accounting Platform for Indian Businesses",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Legacy routes (kept for backward compatibility with existing frontend)
app.include_router(chat.router)
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(accounts.router)
app.include_router(finance.router)

# Phase 2 & 4 routes
app.include_router(ai_router.router)
app.include_router(journal_router.router)
app.include_router(bank_router.router)
app.include_router(parties_router.router)

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "app": "NexBooks", "phase": 2}
