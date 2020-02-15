let express = require('express');
let path = require('path');
let logger = require('morgan');
let bodyParser = require('body-parser');
let redis = require('redis');

const ejs = require('ejs');
ejs.delimiter = '|';

// start a local Redis-server
const { spawn } = require('child_process');
console.log('Launching a local Redis Server ...');
const redis_server = spawn('redis-server');
// start a Terminal for dev access to Redis 
console.log('Launching a shell for a Redis client ... type redis-cli');
const redis_cli = spawn('open', [ '-a', 'Terminal','-n']);

let app = express();

// Create Redis Client - Must have Redis server started with cmd: redis-server 
// ToDo - Maybe rename client to redisClient ?!
let client = redis.createClient();

client.on('connect', function () {
  console.log('Redis Server Connected...');
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('ejs.open', '<<');
app.set('ejs.close', '>>');

let allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
}

app.use(allowCrossDomain);

app.options('/', function (req, res) {
  res.header('Access-Control-Allow-Origin').send()
});

// middleware
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  let title = 'Task List';

  // read all tasks entries from Redis db
  client.lrange('tasks', 0, -1, function (err, reply) {
    // get all fields of the hash 'call'
    client.hgetall('call', function (err, call) {
      res.render('index', {
        title: title,
        tasks: reply,
        call: call
      });
    })

  });
});

// adding a task posted from form
app.post('/task/add', function (req, res) {
  let task = req.body.task;

  client.rpush('tasks', task, function (err, reply) {
    if (err) {
      console.log(err);
    }
    console.log('Task Added...');
    res.redirect('/');
  });
});

// deleting tasks
app.post('/task/delete', function (req, res) {
  let tasksToDel = req.body.tasks;

  client.lrange('tasks', 0, -1, function (err, tasks) {
    for (let i = 0; i < tasks.length; i++) {
      // if task[i] is in tasksToDel array
      if (tasksToDel.indexOf(tasks[i]) > -1) {
        client.lrem('tasks', 0, tasks[i], function () {
          if (err) {
            console.log(err);
          }
        })
      }
    }
    res.redirect('/');
  })
});

// add Next Call hash to Redis 
app.post('/call/add', function (req, res) {
  let newCall = {};

  newCall.name = req.body.name;
  newCall.company = req.body.company;
  newCall.phone = req.body.phone;
  newCall.time = req.body.time;

  client.hmset('call', ['name', newCall.name, 'company', newCall.company, 'phone', newCall.phone, 'time', newCall.time], function (err, reply) {
    if (err) {
      console.log(err);
    }
    console.log(reply);
    res.redirect('/');
  });

});

app.listen(3000);
console.log('Server Started On Port 3000...');

module.exports = app;