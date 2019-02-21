'use strict';

// Load environmnet variables from .env file
require('dotenv').config();

// Application dependencies
const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');

// Application setup
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());

// API ROUTES
// Location route
app.get('/location', (request, response) => {     // anon callback function
  searchToLatLong(request.query.data)             // calls geocode lookup handler
    .then(location => response.send(location))    // then sends the location result
    .catch(error => handleError(error, response));// and catches anything else with the error handler
});

// Need a route so client can request weather data
app.get('/weather', getWeather);

// Meetups route so client can request meetup data
app.get('/meetups', getMeetups);

// Catch-all route that invokes handle-Error() if bad request comes in
app.use('*', (err, response) => { // listen for all other routes (not '/location', '/weather', etc.)
  handleError(err, response);     // call error handler and pass in error and response
});

// Make sure server is listening for requests
app.listen(PORT, () => console.log(`App is up on ${PORT}`));

// **************************
// Helper Functions
// **************************

// Error handler
function handleError(err, response) { // takes an error and a response
  console.error(err);            // logs the error to the console
  if (response) response.status(500).send('Sorry, something went wrong'); // if the response is truthy, give it a status of '500' and send a message to the user
}

// Geocode lookup handler
function searchToLatLong(query) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;

  return superagent.get(url)
    .then(res => {
      return new Location(query, res);
    })
    .catch(error => handleError(error));
}

// Weather route handler
function getWeather(request, response) {
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

  superagent.get(url)
    .then(result => {
      const weatherSummaries = result.body.daily.data.map(day => {
        return new Weather(day)
      });
      response.send(weatherSummaries);
    })
    .catch(error => handleError(error, response));
}

// Meetups route handler
function getMeetups(request, response) {
  const url = `https://api.meetup.com/find/upcoming_events?&sign=true&photo-host=public&lon=${request.query.data.longitude}&page=10&lat=${request.query.data.latitude}&key=${process.env.MEETUP_API_KEY}`;

  superagent.get(url)
    .then(result => {
      const meetups = result.body.events.map(meetup => {
        return new Meetups(meetup)
      });
      response.send(meetups);
    })
    .catch(error => handleError(error, response));
}

// **************************
// Models
// **************************

function Location(query, res) {
  this.search_query = query;
  this.formatted_query = res.body.results[0].formatted_address;
  this.latitude = res.body.results[0].geometry.location.lat;
  this.longitude = res.body.results[0].geometry.location.lng;
}

// Constructor needed for function getWeather()
function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toString().slice(0, 15);
}

// Constructor needed for function getMeetups()
function Meetups(response) {
  // console.log('meetup response:', response);
  console.log('meetup response.link:', response.link);
  this.link = response.link;
  this.name = response.name;
  this.creation_date = new Date(response.created).toString().slice(0, 15)
  this.host = response.group.name;
}
