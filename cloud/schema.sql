CREATE TABLE docs (id TEXT PRIMARY KEY NOT NULL, title TEXT, text TEXT, mime TEXT, data TEXT, owner TEXT, created REAL);
--> statement-breakpoint
CREATE TABLE questions (id TEXT PRIMARY KEY NOT NULL, question TEXT, expert TEXT, evidence TEXT, answer TEXT, status TEXT, created REAL);
