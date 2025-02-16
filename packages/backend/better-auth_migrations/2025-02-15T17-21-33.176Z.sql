create table connection (
    id integer primary key autoincrement,
    user_id text not null references user(id),
    connection_string text not null,
    created_at timestamp not null default CURRENT_TIMESTAMP
);