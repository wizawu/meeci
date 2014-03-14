-- SQLite version 3 --

-- user --
CREATE TABLE user (
    id        INTEGER PRIMARY KEY,
    user      VARCHAR(32),
    name      VARCHAR(64),
    email     VARCHAR(128),
    passwd    CHAR(32)
);

CREATE UNIQUE INDEX user_user_idx ON user(user);
CREATE UNIQUE INDEX user_email_idx ON user(email);

INSERT INTO user(id, user, name, email, passwd) VALUES(
    1000000000, 'root', 'root', 'wizawu@gmail.com', '63a9f0ea7bb98050796b649e85481845'
);

-- build --
CREATE TABLE build (
    id           INTEGER PRIMARY KEY,
    
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

    start        TEXT,
    duration     INTEGER,
    return       SMALLINT 
);

CREATE INDEX build_repos_idx ON build(repos, owner, host);

-- repos --
CREATE TABLE repos (
    id           INTEGER PRIMARY KEY,
    user         TEXT,
    host         SMALLINT,
    owner        TEXT,
    repos        TEXT,
    desc         TEXT,
    container    TEXT,
    script       TEXT
);

CREATE UNIQUE INDEX repos_user_idx ON repos(user, repos, owner, host);

-- container --
CREATE TABLE container (
    id      INTEGER PRIMARY KEY,
    user    TEXT,
    name    VARCHAR(64),
    desc    TEXT,
    size    INTEGER,
    time    TEXT
);

CREATE UNIQUE INDEX container_name_idx ON container(user, name);
