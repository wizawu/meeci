-- user --
CREATE TABLE users (
    id        SERIAL PRIMARY KEY,
    user_     VARCHAR(32) NOT NULL,
    name      VARCHAR(64),
    email     VARCHAR(128) NOT NULL,
    passwd    CHAR(44) NOT NULL,
    salt      CHAR(44) NOT NULL,
    status    SMALLINT DEFAULT 0
);

CREATE UNIQUE INDEX users_user_idx ON users(user_);
CREATE UNIQUE INDEX users_email_idx ON users(email);

INSERT INTO users(user_, name, email, status, passwd, salt) VALUES(
    'root', 'root', 'root@meeci.net', 1,
    'rDzN/Z+oLLdQK9TAiLTQuvS/MZh25tstrpWRPIyFJbU=',
    'G4y2NAwMP7ES7pm+xO5ttt5L29gEurxoMFzur3iOFcw='
);

-- build --
CREATE TABLE build (
    id           SERIAL PRIMARY KEY,
    
    host         SMALLINT,
    owner        TEXT,
    repos        TEXT,
    build        INTEGER,

    branch       TEXT,
    commit       TEXT,
    committer    TEXT,
    message      TEXT,

    container    TEXT,
    worker       TEXT,

    start        TIMESTAMP WITH TIME ZONE,
    duration     INTEGER,
    return       SMALLINT 
);

CREATE INDEX build_repos_idx ON build(repos, owner, host);

-- repos --
CREATE TABLE repos (
    id           SERIAL PRIMARY KEY,
    user_        TEXT,
    host         SMALLINT,
    owner        TEXT,
    repos        TEXT,
    descr        TEXT,
    container    TEXT,
    script       TEXT
);

CREATE UNIQUE INDEX repos_user_idx ON repos(user_, repos, owner, host);

-- container --
CREATE TABLE container (
    id       SERIAL PRIMARY KEY,
    user_    TEXT,
    name     VARCHAR(64),
    descr    TEXT,
    size     INTEGER,
    time     TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX container_name_idx ON container(user_, name);
