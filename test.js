var http = require('https'),
url = require('url');


var opts = url.parse('https://api.github.com/users/englercj');

opts.port = 443;
opts.method = 'GET';

var req = http.request(opts),
body;

req.on('response', function(res) {
    res.on('data', function(chunk) {
        if(!body) body = chuck;
        else body += chunk;
    });

    res.on('end', function() {
        console.log(body);
	process.exit(0);
    });

    res.on('close', function(err) {
	console.log(err);
	process.exit(1);
    });
});

req.on('error', function(err) {
    console.log(err);
    process.exit(1);
});
