-- Nexora Cloudflare D1 Database Schema
-- Dedicated tables with 'nexora_' prefix to avoid collisions in shared databases

-- 1. Users table (Each email can be used ONLY once globally)
CREATE TABLE IF NOT EXISTS nexora_users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for instant email lookup and uniqueness enforcement
CREATE UNIQUE INDEX IF NOT EXISTS idx_nexora_users_email ON nexora_users(email);

-- 2. Sessions table for global authentication
CREATE TABLE IF NOT EXISTS nexora_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY(user_id) REFERENCES nexora_users(id) ON DELETE CASCADE
);

-- 3. Conversations table for cloud chat sync
CREATE TABLE IF NOT EXISTS nexora_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    subject TEXT,
    category TEXT DEFAULT 'Today',
    messages_json TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES nexora_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_nexora_conversations_user ON nexora_conversations(user_id);
