var express = require('express')
var reInterval = require('reinterval')
var bodyParser = require('body-parser')
var os 	= require('os-utils')
var axios = require('axios')
var _ = require('lodash')

var app = express()

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