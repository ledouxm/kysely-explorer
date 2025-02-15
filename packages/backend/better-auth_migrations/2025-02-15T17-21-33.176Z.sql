create table connection (
    id serial primary key,
    user_id text not null references users(id),
    connection_string text not null,
    created_at timestamp not null default CURRENT_TIMESTAMP
);