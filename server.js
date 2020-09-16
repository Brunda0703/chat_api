console.log("Server.js");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
var util = require('util')
const https = require('https');
const path = require("path");
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoConnect = require('./database').mongoConnect;
const getdb = require('./database').getDb;
const mongodb = require('mongodb');
var server = app.listen(process.env.PORT || 3000);
mongoConnect();
// console.log(server);
var io = require("socket.io")(server);

// var mysql = require("mysql");

app.use(bodyParser.urlencoded());

const accessLogStream = fs.createWriteStream(
	path.join(__dirname, "access.log"), {
		flags: 'a'
	}
);

app.use(helmet());
app.use(compression());
app.use(morgan('combined', {
	stream: accessLogStream
}));

// var connection = mysql.createConnection({
// 	"host": "localhost",
// 	"user": "root",
// 	"password": "",
// 	"database": "web_chat"
// });

// connection.connect(function (error) {
// 	//
// });

app.use(function (request, result, next) {
	result.setHeader("Access-Control-Allow-Origin", "*");
	// result.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
	// result.setHeader('Access-Control-Allow-Headers', 'Content-Type/, Authorization');
	next();
});

app.post("/get_messages", function (request, result) {


	const db = getdb();
	// console.log('Request received: ');
	// util.log(util.inspect(request)) // this line helps you inspect the request so you can see whether the data is in the url (GET) or the req body (POST)
	// util.log('Request recieved: \nmethod: ' + request.method + '\nurl: ' + request.url) // this line logs just the method and url
	// request.on('data', function (chunk) {
    //     console.log('GOT DATA!');
    // });
	console.log(request);
	// console.log(request);
	db.collection('messages').find({
			$or: [{
				sender: request.body.sender,
				receiver: request.body.receiver
			}, {
				sender: request.body.receiver,
				receiver: request.body.sender
			}]
		})
		.toArray()
		.then(user => {
			console.log(user);
			result.end(JSON.stringify(user));
			// result.status(200).json(user);
		})
		.catch(err => console.log(err));

	// connection.query("SELECT * FROM messages WHERE (sender = '" + request.body.sender + "' AND receiver = '" + request.body.receiver + "') OR (sender = '" + request.body.receiver + "' AND receiver = '" + request.body.sender + "')", function (error, messages) {
	// 	result.end(JSON.stringify(messages));
	// });
});

app.use("/", function (request, result, next) {
	result.status(200).json("Hello world !");
});

var users = [];

io.on("connection", function (socket) {
	console.log("User connected: ", socket.id);

	socket.on("user_connected", function (username) {
		users[username] = socket.id;
		io.emit("user_connected", username);
	});

	socket.on("send_message", function (data) {
		var socketId = users[data.receiver];
		socket.to(socketId).emit("message_received", data);
		const db = getdb();
		db.collection('messages')
			.insertOne({
				sender: data.sender,
				receiver: data.receiver,
				message: data.message
			})
			.then((result) => {
				console.log(result);
			}).catch((err) => {
				console.log(err);
			});
		// connection.query("INSERT INTO messages (sender, receiver, message) VALUES ('" + data.sender + "', '" + data.receiver + "', '" + data.message + "')", function (error, result) {
		// 	//
		// });
	});
});