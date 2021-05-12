require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns');
const {nanoid} = require('nanoid');
const mongoose = require('mongoose');

// Set up MongoDB connection
mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true});

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
const Schema = mongoose.Schema;

const urlSchema = new Schema({
  original_url: {type: String, required: true},
  short_url: {type: String, required: true, default: () => nanoid(5)}
});

const URLS = mongoose.model('urls', urlSchema);

app.post('/api/shorturl', function(req, res) {
  let getUrl = req.body.url;

  // Class URL refer: https://nodejs.org/api/url.html#url_class_url
  if (getUrl == '' || (/^https?:\/\//i).test(getUrl) == false) {
    return res.json({
      error: "invalid url"
    });
  } else {
    getUrl = new URL(getUrl);
  }

  // Get host
  let host = getUrl.host

  // Verify url
  dns.lookup(host, function(err, addresses, family) {
    console.log(err, "addresses: " + addresses, "IPv: " + family);
    
    if (err) {
      console.log(err)
      return res.json({
        error: 'invalid url'
      });
    }

    URLS.findOne({original_url: getUrl.href}, function(err, data) {
      if (err) {
        return console.log(err);
      }
      
      if (data) {
        console.log('Url already exist');
        
        return res.json({
          original_url: data.original_url,
          short_url: data.short_url
        });
      } else {
        const urlData = new URLS({
          original_url: getUrl.href
        });

        urlData.save(function(err, data) {
          if (err) {
            return console.log(err);
          } else {
            return res.json({
              original_url: data.original_url,
              short_url: data.short_url
            });
          }
        });
      }
    });
  });
});

app.get('/api/shorturl/:nanoid', function(req, res) {
  const nanoid = req.params.nanoid;

  URLS.findOne({short_url: nanoid}, function(err, data) {
    if (err) {
      return console.log(err);
    } else {
      return res.redirect(data.original_url);
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
