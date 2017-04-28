/************************************************
 * File : node.js
 * Oleh : 
 *   Kelompok 
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
 *             DATA DICTIONARY
 *
 ***********************************************/
const FOLLOWER_STATE = 0
const CANDIDATE_STATE = 1
const LEADER_STATE = 2

const MAJORITY = 3 // Jumlah node total = 5

var state = FOLLOWER_STATE
var selfTerm = 0
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
		workload: 1.0,
		status: 'up'
	},
	{
		ip: 'localhost',
		port: '13337',
		daemonPort: '7778',
		workload: 1.0,
		status: 'up'
	},
	]

var selfData = parseInt(process.argv[2]) // Example to run: node node.js 0
var leader = {}
var setVote = new Set()
var timeInterval = getRandomInt((10*700), (10*900))

/*
 *  Timeout function for each node.
 *
 */
var inter = reInterval(function () {
	if(state == CANDIDATE_STATE){
		timeInterval = getRandomInt((10*700), (10*900))
		console.log('Vote size: '+setVote.size)
		if(setVote.size >= MAJORITY) {
			console.log('Succes become leader')
			sendHeartbreath()
			timeInterval = 2000
			state = LEADER_STATE
		} else {
			console.log('Back to follower state')
			setVote = new Set()
			state = FOLLOWER_STATE
		}

		inter.reschedule(timeInterval) // reset schedule

	} else if (state == FOLLOWER_STATE) {
		state = 1
		console.log("Send election")
		broadcastElection()
		timeInterval = 3000
		inter.reschedule(timeInterval)

	} else { // state == LEADER_STATE
		console.log("Send hearthbreath")
		updateServerData()
		sendHeartbreath()	
	}

}, timeInterval)

/***********************************************
 *             EXPRESS.JS ROUTING
 *
 ***********************************************/
var urlencodedParser = bodyParser.json();

app.post('/', urlencodedParser, function (req, res) { //respon Heartbreath
	console.log("Follower")
	if(selfTerm <= req.body.term){
		leader.ip = req.body.ip
		leader.port = req.body.port
		selfTerm = req.body.term
		serverData = req.body.serverData
		state = FOLLOWER_STATE
		// console.log(serverData)
		inter.reschedule(timeInterval)
	}
	res.send('1')
})

app.get('/:term', function (req, res) { // respon election
	let _term = parseInt(term)
	if((state == FOLLOWER_STATE) && (_term >= selfTerm)) {
		selfTerm++;	
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

/* 
 * Fungsi SendHeartbeat dipanggil oleh Leader
 * untuk broadcasting data ke setiap node
 */
function sendHeartbreath() {
	_.forEach(nodeData, function(obj,i){
		if(i != selfData){
			let url = 'http://'+obj.ip+':'+obj.port+'/' 
			console.log('Send to :'+url)
			nodeData[selfData].serverData = serverData
			nodeData[selfData].term = selfTerm
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
			obj.workload = 1.0
			obj.status = 'down'
		})
	})
}

/* 
 * Fungsi BroadcastElection dipanggil oleh Candidate
 * untuk memulai proses voting
 */
function broadcastElection() {
	_.forEach(nodeData, function(obj,i){
		if(i != selfData){
			let url = 'http://'+obj.ip+':'+obj.port+'/'+selfTerm
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