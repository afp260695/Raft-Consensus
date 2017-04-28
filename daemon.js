/************************************************
 * File : daemon.js
 * Oleh : 
 *   Kelompok Kucing_Gundhul
 *   1. Richard Wellianto  / 13514051
 *   2. Ahmad Fajar P.     / 13514053
 *   3. Robert Sebastian H / 13514061
 *
 ************************************************/
 
/***********************************************
 *                  LIBRARY
 *
 ***********************************************/
var express = require('express')
var reInterval = require('reinterval')
var bodyParser = require('body-parser')
var os 	= require('os-utils')
var axios = require('axios')
var _ = require('lodash')

var app = express()

/***********************************************
 *             EXPRESS.JS ROUTING
 *
 ***********************************************/
app.get('/', function (req, res) {
	os.cpuUsage(function(v){
		var response = {
			workload: v,
			status: 'up'
		}
	    res.send(response); // CPU usage (%)
	});
})

var port = (process.argv[2]) ? parseInt(process.argv[2]) : 7777
app.listen(port, function() {
	console.log('Daemon is listening on port ' + port)
})