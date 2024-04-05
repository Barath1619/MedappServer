const express = require("express");
const port = 3000;
const port1 = 3001;
const app = express();
const bodyParser = require('body-parser');

require('./db');
require('./models/users');
require('./models/approval');
require('./models/docAppointments');
require('./models/bookings');
require('./models/Chat')
const userauth = require('./routes/user_auth');
const requesttoken = require('./middleware/authtokencheck');

//for chat 
const {createServer} = require('http');
const {Server} = require('socket.io');
const { doesNotMatch } = require("assert");
const chatServer = createServer();
const io = new Server(chatServer,{});

app.use(bodyParser.json());
app.use(userauth);

app.get('/',requesttoken,(req,res)=> {
    console.log(req.user);
    res.send(`${req.user}`);
});

io.on('connection', (socket)=>{

    console.log("USER CONNECTED - ", socket.id);

    socket.on('disconnected', ()=>{
    console.log("USER DISCONNECTED - ", socket.id);
    })

    socket.on('joined', (data) => {
        console.log("User", socket.id, "Joined room", data.roomid);
        socket.join(data);
    })

    socket.on('send_message', (data)=>{
        console.log('message received', data);
        io.emit('receive_message', data);
    })
})

chatServer.listen(port1, ()=>{
    console.log(`Socket IO Server running on port ${port1}`);
})

// chatServer.listen(port1)

app.listen(port, ()=>{
    console.log(`Server running on port ${port}`);
})