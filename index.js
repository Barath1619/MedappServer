const express = require("express");
const port = 3000;

const app = express();
const bodyParser = require('body-parser');

require('./db');
require('./models/users');

const userauth = require('./routes/user_auth');
const requesttoken = require('./middleware/authtokencheck');

app.use(bodyParser.json());
app.use(userauth);

app.get('/',requesttoken,(req,res)=> {
    console.log(req.user);
    res.send(`${req.user}`);
});


app.listen(port, ()=>{
    console.log(`Server running on port ${port}`);
})