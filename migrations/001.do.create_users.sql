CREATE TABLE users (
  id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  UNIQUE(username)
);