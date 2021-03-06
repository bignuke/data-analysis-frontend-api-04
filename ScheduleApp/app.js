const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJSDoc({
  swaggerDefinition: {
    info: {
      title: 'ScheduleApp',
      version: '1.0.0',
      description: 'Web Services Development project to bring multiple different Rose-Hulman information into one collective dataset'
    },
    host: 'localhost:3000',
    basePath: '/'
  },
  apis: [
    './routes/*.js',
    'definitions.yaml'
  ]
});

mongoose.Promise = global.Promise;

require('./models/student');
require('./models/faculty');
require('./models/term');
require('./models/course');
require('./models/group');

const index = require('./routes/index');
const users = require('./routes/users');
const schedules = require('./routes/route');

const app = express();

const dbURI = 'mongodb://localhost/schedule';

mongoose.connect(dbURI, err => {
  if (err) {
    console.log(`ERROR connecting to ${dbURI}. ${err}`);
  } else {
    console.log(`Successfully connected to ${dbURI}`);
  }
});

app.disable('etag');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', schedules);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.get('/swagger.json', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
})

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;