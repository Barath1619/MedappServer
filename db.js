const mongoose=require('mongoose');
require('dotenv').config();


mongoose.connect(process.env.mongodb_url).then(
    ()=>{
        console.log('connected to DB');
    }
)
.catch(  (err) =>{
    console.log('could not connect to db' + err)
})