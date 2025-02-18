create table llm_chat (
    id text primary key,
    user_id text not null references user(id),
    messages TEXT NOT NULL,
    created_at timestamp not null default CURRENT_TIMESTAMP
)