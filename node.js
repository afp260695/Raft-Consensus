var express = require('express')
var reInterval = require('reinterval')
var bodyParser = require('body-parser')
var os 	= require('os-utils')
var axios = require('axios')
var _ = require('lodash')

var app = express()

var state = 0 // 0 = Follower, 1 = Candidate, 2 = Leader
var data = []

var nodeData = [
		{
			ip: '127.0.0.1',
			proxy: '3001' 
		},
		{
			ip: '127.0.0.1',
			proxy: '3002' 
		},
		{
			ip: '127.0.0.1',
			proxy: '3003' 
		},
		{
			ip: '127.0.0.1',
			proxy: '3004' 
		},
		{
			ip: '127.0.0.1',
			proxy: '3005' 
		},
	];

var selfData = parseInt(process.argv[2]) // Example to run: node node.js 0
var leader = 0
var setVote = new Set()
var timeInterval = getRandomInt((10*1000), (10*1300))

var inter = reInterval(function () {
	if(state == 1){
		timeInterval = getRandomInt((1000), (1300))
		console.log("Send election")
		if(setVote.size >= 3) {
			sendHeartbreath()
			timeInterval = 200
			state = 2
		} else {
			setVote = new Set()
			broadcastElection()
		}

		inter.reschedule(timeInterval) // reset schedule
	} else if (state == 0) {
		state = 1
		console.log("Send election")
		broadcastElection()
		timeInterval = 200
		inter.reschedule(timeInterval)
	} else {
		console.log("Send hearthbreath")
		sendHeartbreath()	
	}

}, timeInterval)

var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.post('/', urlencodedParser, function (req, res) { //respon election
	if(state == 0) {
		leader.ip = req.body.ip
		leader.proxy = req.body.proxy
		inter.reschedule(timeInterval)
		res.send(String(nodeData[selfData].proxy))
	} else {
		res.send('0')
	}
})

app.get('/', function (req, res) { // respon Heartbreath
	console.log("Follower")
	inter.reschedule(timeInterval)
	res.send('1')
})

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function broadcastElection() {
	_.forEach(nodeData, function(obj,i){
		if(i != selfData){
			let url = 'http://'+obj.ip+':'+obj.proxy+'/' 
			console.log('Send to :'+url)
			axios({
				method: 'post',
				url: url,
				data: nodeData[selfData]
			})
			.then((data) => {
				console.log('Succes: '+data.data)
				if(data != '0') {
					setVote.add(data.data)
				}
			})
			.catch((err) => {
				console.log('Error: '+err)
			})
		}
	})
}

function sendHeartbreath() {
	_.forEach(nodeData, function(obj,i){
		if(i != selfData){
			let url = 'http://'+obj.ip+':'+obj.proxy+'/' 
			console.log('Send to :'+url)
			axios({
				method: 'get',
				url: url
			})
			.then((data) => {
				console.log('Succes: '+data.data)
			})
			.catch((err) => {
				console.log('Error: '+err)
			})
		}
	})
}
 
app.listen(nodeData[selfData].proxy)