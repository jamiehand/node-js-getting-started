var pg = require('pg');
var cool = require('cool-ascii-faces');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var http = require('http');
var https = require('https');

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.get('/cool', function(request, response) {
  response.send(cool());
});

app.get('/times', function(request, response) {
  var result = ''
  var times = process.env.TIMES || 5
  for (i=0; i < times; i++)
    result += i + ' ';
  response.send(result);
});

app.get('/db', function(request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM test_table', function(err, result) {
      done();
      if (err)
        { console.error(err); response.send("Error " + err);  }
      else
        { response.render('pages/db', {results: result.rows} ); }
    });
  });
});

app.get('/sayhi', function(request, response) {
  response.send({"text": "Hello world!"});
});


/* bodyParser is for isitup functionality, for interpreting the request */

/** bodyParser.urlencoded(options)
 * Parses the text as URL encoded data (which is how browsers tend to send form data from regular forms set to POST)
 * and exposes the resulting object (containing the keys and values) on req.body
 */
app.use(bodyParser.urlencoded({
    extended: true
}));

/**bodyParser.json(options)
 * Parses the text as JSON and exposes the resulting object on req.body.
 */
app.use(bodyParser.json());

app.post('/isitup', function(request, response) {
  var command = request.body.command;
  var text = request.body.text;
  var token = request.body.token;
  var msg = "default msg";
  var status_code = 0;

  // Check the token and make sure the request is from our team
  if (token != process.env.ISITUP_TOKEN) {
    msg = "The token for the slash command doesn't match. Check your script.";
  } else {
    // isitup.org doesn't require you to use API keys, but they do require that
    // any automated script send in a user agent string.
    var user_agent = "IsitupForSlack/1.0 (https://github.com/mccreath/istiupforslack; mccreath@gmail.com)";
    // We're just taking the text exactly as it's typed by the user. If it's
    // not a valid domain, isitup.org will respond with a `3`.
    // We want to get the JSON version back (you can also get plain text).
    var options = {
      host: 'isitup.org',
      port: 443,
      path: '/' + text + '.json',
      headers: {
        'User-Agent': user_agent
      }
    };
    https.get(options, function(res) {
      console.log("Got response: " + res.statusCode);
      // TODO return a different message based on whether the site is up or
      // not (based on res form isitup.org).
      // Parse the JSON and get the status_code member from the body of res
      // (advice on this from http://stackoverflow.com/a/6968669/4979097).
      // msg =
      res.on('data', function (chunk) {
        // console.log('BODY: ' + chunk);
        // console.log(typeof chunk);
        // list object's properties
        // NOTE: chunk is an object that needs to be parsed to be recognized
        // as JSON!
        chunk = JSON.parse(chunk);
        // console.log(Object.keys(chunk));
        status_code = chunk['status_code'];
        console.log("status_code: " + status_code);

        // send a different msg depending on status_code
        if (status_code == 1) {
          msg = "Yay! " + text + " is *up*! :) ";
        } else if (status_code == 2) {
          console.log("hello!!!");
          msg = "Oh no! " + text + " is *down*. :( ";
        } else if (status_code == 3) {
          msg = "Uh oh, isitup.org doesn't think " + text + " is a valid " +
                "domain. Please enter both the domain name AND suffix " +
                " (example: *amazon.com* or *whitehouse.gov*).";
        } else {
          msg = "Hm, this message shouldn't be reached.";
        }
        response.send({"text": msg});
      });
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
    });
  } // end if-else that checks whether token is correct
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
