console.log("Server.js");
var express = require("express");
var app = express();
const path = require("path");
const fs = require('fs');
// var http = require("http").createServer(app);
var server = app.listen(3000 || process.env.PORT);
var io = require("socket.io")(server);
var mysql = require("mysql");
const mongoConnect = require('./database').mongoConnect;
const getdb = require('./database').getDb;
const mongodb = require('mongodb');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded());

// var connection = mysql.createConnection({
// 	"host": "localhost",
// 	"user": "root",
// 	"password": "",
// 	"database": "web_chat"
// });

const accessLogStream = fs.createWriteStream(
	path.join(__dirname, "access.log"), {
		flags: 'a'
	}
);

// connection.connect(function (error) {
// 	//
// });


app.use(helmet());
app.use(compression());
app.use(morgan('combined', {
	stream: accessLogStream
}));

app.use(function (request, result, next) {
	result.setHeader("Access-Control-Allow-Origin", "*");
	result.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
	result.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	next();
});

app.post("/get_messages", function (request, result) {


	const db = getdb();
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
		})
		.catch(err => console.log(err));

	// connection.query("SELECT * FROM messages WHERE (sender = '" + request.body.sender + "' AND receiver = '" + request.body.receiver + "') OR (sender = '" + request.body.receiver + "' AND receiver = '" + request.body.sender + "')", function (error, messages) {
	// 	result.end(JSON.stringify(messages));
	// });
});

app.get("/", function (request, result) {
	result.end("Hello world !");
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

mongoConnect();