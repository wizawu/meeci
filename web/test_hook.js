var http = require("http")

var hook = {
  "ref": "refs/heads/master",
  "after": "364c1b5c0bca6b81cd4bf90290cc6663889a33b2",
  "before": "bda971714ec6f7691a4ce08e340f7b4c08cd00bb",
  "created": false,
  "deleted": false,
  "forced": true,
  "compare": "https://github.com/wizawu/meeci-worker/compare/bda971714ec6...364c1b5c0bca",
  "commits": [
    {
      "id": "364c1b5c0bca6b81cd4bf90290cc6663889a33b2",
      "distinct": true,
      "message": "to fix: tar file changed as we read it",
      "timestamp": "2014-04-03T11:54:20+08:00",
      "url": "https://github.com/wizawu/meeci-worker/commit/364c1b5c0bca6b81cd4bf90290cc6663889a33b2",
      "author": {
        "name": "wizawu",
        "email": "wizawu@gmail.com",
        "username": "wizawu"
      },
      "committer": {
        "name": "wizawu",
        "email": "wizawu@gmail.com",
        "username": "wizawu"
      },
      "added": [

      ],
      "removed": [

      ],
      "modified": [
        "worker.lua"
      ]
    }
  ],
  "head_commit": {
    "id": "364c1b5c0bca6b81cd4bf90290cc6663889a33b2",
    "distinct": true,
    "message": "to fix: tar file changed as we read it",
    "timestamp": "2014-04-03T11:54:20+08:00",
    "url": "https://github.com/wizawu/meeci-worker/commit/364c1b5c0bca6b81cd4bf90290cc6663889a33b2",
    "author": {
      "name": "wizawu",
      "email": "wizawu@gmail.com",
      "username": "wizawu"
    },
    "committer": {
      "name": "wizawu",
      "email": "wizawu@gmail.com",
      "username": "wizawu"
    },
    "added": [

    ],
    "removed": [

    ],
    "modified": [
      "worker.lua"
    ]
  },
  "repository": {
    "id": 16689696,
    "name": "meeci-worker",
    "url": "https://github.com/wizawu/meeci-worker",
    "description": "A stand-alone Lua program to execute build tasks for Meeci",
    "homepage": "",
    "watchers": 1,
    "stargazers": 1,
    "forks": 0,
    "fork": false,
    "size": 252,
    "owner": {
      "name": "wizawu",
      "email": "wizawu@gmail.com"
    },
    "private": false,
    "open_issues": 0,
    "has_issues": true,
    "has_downloads": true,
    "has_wiki": false,
    "language": "Lua",
    "created_at": 1392022700,
    "pushed_at": 1396497313,
    "master_branch": "master"
  },
  "pusher": {
    "name": "wizawu",
    "email": "wizawu@gmail.com"
  }
};

var hook_str = JSON.stringify(hook);

var headers = {
    'Content-Type': 'application/json',
    'Content-Length': hook_str.length
};

var options = {
    host: '0.0.0.0',
    port: 3780,
    path: '/hooks/wizawu',
    method: 'POST',
    headers: headers
};

var req = http.request(options, function(res) {
    console.log(res.statusCode);
});

req.on('error', function(err) { console.error(err); });
req.write(hook_str);
req.end();
