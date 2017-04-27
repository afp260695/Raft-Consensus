var express = require('express')
var reInterval = require('reinterval')
var bodyParser = require('body-parser')
var os 	= require('os-utils')
var axios = require('axios')
var _ = require('lodash')

var app = express()

var state = 0 // 0 = Follower, 1 = Candidate, 2 = Leader

var nodeData = [
		{
			ip: '127.0.0.1',
			port: '3001' 
		},
		{
			ip: '127.0.0.1',
			port: '3002' 
		},
		{
			ip: '127.0.0.1',
			port: '3003' 
		},
		{
			ip: '127.0.0.1',
			port: '3004' 
		},
		{
			ip: '127.0.0.1',
			port: '3005' 
		},
	]

var serverData = [
	{
		ip: 'localhost',
		port: '13337',
		daemonPort: '7777',
		workload: 0.0,
		status: 'up'
	},
	{
		ip: 'localhost',
		port: '13337',
		daemonPort: '7778',
		workload: 0.0,
		status: 'up'
	},
	]

var selfData = parseInt(process.argv[2]) // Example to run: node node.js 0
var leader = {}
var setVote = new Set()
var timeInterval = getRandomInt((10*1000), (10*1300))

var inter = reInterval(function () {
	if(state == 1){
		timeInterval = getRandomInt((10*1000), (10*1300))
		console.log('Vote size: '+setVote.size)
		if(setVote.size >= 3) {
			console.log('Succes become leader')
			sendHeartbreath()
			timeInterval = 200
			state = 2
		} else {
			console.log('Back to follower state')
			setVote = new Set()
			state = 0
		}

		inter.reschedule(timeInterval) // reset schedule
	} else if (state == 0) {
		state = 1
		console.log("Send election")
		broadcastElection()
		timeInterval = 5000
		inter.reschedule(timeInterval)
	} else {
		console.log("Send hearthbreath")
		updateServerData()
		sendHeartbreath()	
	}

}, timeInterval)

var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.post('/', urlencodedParser, function (req, res) { //respon Heartbreath
	console.log("Follower")
	/*******************************************************
	*                      DISINIII!!!
	* Mauku : saat kirim Heartbeat, kirim juga serverData nya
	* Lalu replace yg lama dgn serverData yg baru
	********************************************************/
	console.log(req.body.ip)
	leader.ip = req.body.ip
	leader.port = req.body.port
	// serverData = req.body.serverData
	inter.reschedule(timeInterval)
	res.send('1')
})

app.get('/', function (req, res) { // respon election
	
	if(state == 0) {	
		inter.reschedule(timeInterval)
		res.send(String(nodeData[selfData].port))
	} else {
		res.send('0')
	}
})

app.get('/query/:n', function (req, res) {
	var mostIdleServer = serverData[0]
	_.forEach(serverData, function(server, i) {
		if (server.workload < mostIdleServer.workload) {
			mostIdleServer = server
		}
	})
	let url = 'http://'+mostIdleServer.ip+':'+mostIdleServer.port+'/'+req.params.n
	console.log('Ask the N-th prime to :'+url)
	axios({
		method: 'get',
		url: url
	})
	.then((data) => {
		res.send('The ' + req.params.n + '-th Prime Number is = ' + data.data)
		
	})
	.catch((err) => {
		console.log('Error: '+err)
	})
})

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function sendHeartbreath() {
	_.forEach(nodeData, function(obj,i){
		if(i != selfData){
			let url = 'http://'+obj.ip+':'+obj.port+'/' 
			console.log('Send to :'+url)
			axios({
				method: 'post',
				url: url,
				data: nodeData[selfData]
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

/* 
 * Fungsi UpdateServerData dipanggil oleh Leader
 * Hasilnya dikirimkan melalui Heartbeat
 */
function updateServerData() { 
	_.forEach(serverData, function(obj, i) {
		let url = 'http://'+obj.ip+':'+obj.daemonPort+'/' 
		console.log('Request workload to Daemon :'+url)
		axios({
			method: 'get',
			url: url
		})
		.then((data) => {
			var response = data.data
			obj.workload = response.workload
			obj.status = response.status
		})
		.catch((err) => {
			console.log('Error: '+err)
		})
	})
	console.log(JSON.stringify(serverData))
}

/* 
 * Fungsi BroadcastElection dipanggil oleh Candidate
 * 
 */
function broadcastElection() {
	_.forEach(nodeData, function(obj,i){
		if(i != selfData){
			let url = 'http://'+obj.ip+':'+obj.port+'/' 
			console.log('Send to :'+url)
			axios({
				method: 'get',
				url: url
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
 
app.listen(nodeData[selfData].port)