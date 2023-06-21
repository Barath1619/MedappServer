
const express = require('express');
const router = express.Router();
const mangoose= require('mongoose');
const User = mangoose.model("users");
const jwt=require('jsonwebtoken'); 
const bcrypt= require('bcrypt')
const nodemailer = require('nodemailer')

require('dotenv').config();

// Nodemailer
// async..await is not allowed in global scope, must use a wrapper
async function emailer(rec_email, vcode) {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    let testAccount = await nodemailer.createTestAccount();
  
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      requireTLS:true,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "barath1997r@gmail.com", // generated ethereal user
        pass: "xwnzfaftdlzxqizu", // generated ethereal password
      },
    });
  
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"Barath Kumar" <barath1997r@gmail.com>', // sender address
      to: `${rec_email}`, // list of receivers
      subject: "Signup Verification Code", // Subject line
      text: `Your verification code is ${vcode}`, // plain text body
      html: `<b>Your verification code is ${vcode}</b>`, // html body
    });
  
    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  }
//




router.post('/signup',async (req,res)=>{
    //res.send("this is sign up page 2");
    //console.log("sent by client ",req.body)

    const{firstname,lastname,dob,phoneno,email,conemail,address,zip} = req.body;
    
    
                const user =new User({
                    firstname,
                    lastname,
                    dob,
                    phoneno,
                    email,
                    conemail,
                    address,
                    zip,
                })

                try{
                    await user.save();
                    //res.send({message:"user saved successfully"});
                    const token = jwt.sign({_id:user._id},process.env.jwt_secret);
                     return res.send({message:"User Registered Successfully",token});
                }
                catch(err){
                    console.log(err);
                    return res.status(422).send({error:err.message})  ;
                }
            }
        )



router.post('/Verify',(req,res)=>{

    //res.send("this is sign up page 2");
    console.log("sent by client ",req.body)

    const{firstname,lastname,dob,phoneno,email,conemail,address,zip} = req.body;

    if(!firstname||!lastname||!dob||!phoneno||!email||!conemail||!address||!zip){
        return res.status(422).json({error:'please fill all fields'});
    }

    User.findOne({email:email})
    .then( async (result) =>{
            if (result){
                return res.status(422).send({error:"Invalid Credentials"});
            }
            try{
                let vcode = Math.floor(100000 + Math.random()*900000);
                let user =[{
                    firstname,
                    lastname,
                    dob,
                    phoneno,
                    email,
                    conemail,
                    address,
                    zip,
                    vcode,
                }]
               
                emailer(email,vcode);
                res.send({message:"Verification Code Sent to your email", udata:user});

            }
            catch(err){
                console.log("error in sending verification", err)
            }

        })

    
})

router.post('/signin', async (req,res) => {
    const {email,conemail} = req.body;
    if (!email || !conemail){
        return res.status(422).json({error:"Please add email or password"});
    }
    const saveduser= await User.findOne({email:email})

    //console.log(saveduser)

    if (!saveduser){
        //console.log("hi")
        return res.status(422).json({error:"User does not exist"});
    }
    try {
        bcrypt.compare(conemail, saveduser.conemail, (err, result) => {
            if (result){
                console.log("password matched");
                const token = jwt.sign({_id:saveduser._id},process.env.jwt_secret);
                res.send({token});
            }
            else{
                console.log("password does not match");
                return res.status(422).json({error:"Incorrect Password"});
            }

        })
    }
    catch(err){
        console.log(err)
    }

    

})


module.exports = router;