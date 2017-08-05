var http = require('http');
var Duplex = require('stream').Duplex;  
var exec = require('child_process').exec;
var fs = require('fs');

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

http.createServer(function (req, res) {
    if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return fs.createReadStream('/data/project/tesseract-ocr-service/www/js/index.html').pipe(res);
    }

    var bufferArray = [];
    req.on('data', function (data) {
        bufferArray.push(data);
    });
    
    var lang = ((req.url.split('/')[2] || '').match(/[a-z\+]{3,7}/) || ['fas'])[0];

    req.on('end', function () {
        var buffer = Buffer.concat(bufferArray);

        // buffer.indexOf('\r\n\r\n') + 4 but for older nodes, 13 => '\r'
        for (var start = 4; start < buffer.length; ++start)
            if (buffer[start - 2] === 13 && buffer[start - 4] === 13) break;

        // buffer.lastIndexOf('\r\n-') but for older nodes, 13 => '\r', 45 => '-'
        for (var end = buffer.length - 1 - 2; end >= 0; --end)
            if (buffer[end] === 13 && buffer[end + 2] === 45) break;

        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain; charset=utf-8' });        
        var stream = new Duplex();
        stream.push(buffer.slice(start, end));
        stream.push(null);
        
        stream.pipe(
            exec(
                '/data/project/tesseract-ocr-service/.local/share/junest/bin/junest -- ' +
                    'TESSDATA_PREFIX=/tessdata tesseract stdin stdout -l ' + lang + ' 2>&1 | grep -v "warning: setlocale"',
                { stdio: 'pipe' },
                function (err, stdout, stderr) {
                    res.end(stdout);
                }
            ).stdin
        );
    });
}).listen(process.env.PORT || 3030);

console.log('Started listening on ' + (process.env.PORT || 3030));
