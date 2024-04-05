const jwt = require('jsonwebtoken');
const mongoose= require('mongoose');
const User = mongoose.model('users');

require('dotenv').config();

module.exports = (req,res,next) => {
    const {authorization} = req.headers;

    

    if(!authorization){
        return res.status(401).send({error: "You must sign up, key not generated"});
    }
    const token =authorization.replace("Bearer ","");
    jwt.verify(token,process.env.jwt_secret,(err,payload)=>{
        
        if(err){
            return res.status(401).send({error: "You must sign up, wronge credentials"});
        }
        const {_id}=payload;
        User.findById(_id).then(userdata=>{
            //console.log(userdata);
            req.user=userdata;
            next();
        });
        
    })
    
    
}