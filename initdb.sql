-- PostgreSQL

CREATE TABLE IF NOT EXISTS user (
    user      VARCHAR(32), 
    name      VARCHAR(64),
    email     VARCHAR(64),
    passwd    CHAR(32),
    token     CHAR(16),

    PRIMARY KEY (user)
);

CREATE UNIQUE INDEX user_email_index ON user (email);

CREATE TABLE IF NOT EXISTS build (
    id            SERIAL,

    service       SMALLINT,
    owner         TEXT,
    repository    TEXT,
    build         INTEGER,

    branch        TEXT,
    commit        TEXT,
    committer     TEXT,
    message       TEXT,

    container     TEXT,
    worker        TEXT,

    start         TIMESTAMP,
    stop          TIMESTAMP,
    return        SMALLINT,

    PRIMARY KEY (id),
    UNIQUE (service, owner, repository, build),
);

CREATE INDEX build_repo_index ON build (service, owner, repository);

CREATE TABLE IF NOT EXISTS repository (
    service       SMALLINT,
    owner         TEXT,
    repository    TEXT,

    PRIMARY KEY (service, owner, repository)
);
