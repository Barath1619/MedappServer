
const express = require('express');
const router = express.Router();
const axios = require('axios');
const cron = require('node-cron');

const mangoose= require('mongoose');
const User = mangoose.model("users");
const Userapprove = mangoose.model("approval");
const Bookings = mangoose.model("bookings");
const Chat = mangoose.model('Chat');
const DocAppointments = mangoose.model("docAppointments");
const requesttoken = require('../middleware/authtokencheck');


const jwt=require('jsonwebtoken'); 
const bcrypt= require('bcrypt')
const nodemailer = require('nodemailer');
const e = require('express');

require('dotenv').config();


// Schedule notifications for upcoming appointments

cron.schedule('*/15 * * * *', async () => {

    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeHHMM = `${currentHour}:${currentMinute}`;
    const fifteenMinutesLater = new Date(currentTime.getTime() + 10 * 60000);
    console.log('Scheduled task is running...');
    const appointments = await Bookings.find({
        date:currentTime.toISOString().split("T")[0], 
        status: "Active",
        time: {$gte: currentTimeHHMM,
        $lt: fifteenMinutesLater.toISOString().split("T")[1].substring(0, 5)
    }
    });
    console.log(appointments);
    if (appointments.length>0){
        for (const appointment of appointments) {

        const patient = User.findById(appointment.patient);
        const doc = User.findById(appointment.doctor);

        const notificationData1 = {
                subID: patient.email,
                appId: 11470,
                appToken: 'vlWrDSIZ9I74ltjyZe0csb',
                title: 'Appointment Reminder',
                message: 'Your appointment is in 15 minutes.',
              };
        const notificationData2 = {
        subID: doc.email,
        appId: 11470,
        appToken: 'vlWrDSIZ9I74ltjyZe0csb',
        title: 'Appointment Reminder',
        message: 'Your appointment is in 15 minutes.',
        };

        try {
            await axios.post('https://app.nativenotify.com/api/indie/notification', notificationData1);
            await axios.post('https://app.nativenotify.com/api/indie/notification', notificationData2);
            console.log(`Notification sent}`);
          } catch (error) {
            console.error(`Failed to send notification`);
          }

    }
    }
      
  });



// Nodemailer

async function emailer(rec_email, vcode, usertype) {
   
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

    if (usertype=="Doctor"){
        let info = await transporter.sendMail({
            from: '"Barath Kumar" <barath1997r@gmail.com>', // sender address
            to: `${rec_email}`, // list of receivers
            subject: "Doctor Registration", // Subject line
            text: `You are registered as Doctor, Your Email Id is ${rec_email}. Your Password is ${vcode}`, // plain text body
            html: `<b>You are registered as Doctor, Your Email Id is ${rec_email}. Your Password is ${vcode}</b>`, // html body
          });

    }
    if (usertype=="Patient"){
        let info = await transporter.sendMail({
            from: '"Barath Kumar" <barath1997r@gmail.com>', // sender address
            to: `${rec_email}`, // list of receivers
            subject: "Patient Registration", // Subject line
            text: `Approved!!! Your Email Id is ${rec_email}. Your Password is ${vcode}`, // plain text body
            html: `<b>Approved!!! Your Email Id is ${rec_email}. Your Password is ${vcode}</b>`, // html body
          });

    }
    else{
        let info = await transporter.sendMail({
          from: '"Barath Kumar" <barath1997r@gmail.com>', // sender address
          to: `${rec_email}`, // list of receivers
          subject: "Signup Verification Code", // Subject line
          text: `Your verification code is ${vcode}`, // plain text body
          html: `<b>Your verification code is ${vcode}</b>`, // html body
        });
    }
}


router.post('/verify',(req,res)=>{

    //res.send("this is sign up page 2");
    console.log("sent by client ",req.body)

    const{firstname,lastname,dob,phoneno,email,conemail,address,zip,userType,password} = req.body;

    if(!firstname||!lastname||!dob||!phoneno||!email||!conemail||!address||!zip){
        return res.status(422).json({error:'please fill all fields'});
    }

    User.findOne({email:email})
    .then( async (result) =>{
            if (result){
                
                return res.status(422).send({error:"User already exists"});
            }
            try{
                let vcode = Math.floor(100000 + Math.random()*900000);
                let user =[{
                    firstname,
                    lastname,
                    dob,
                    phoneno,
                    email,
                    address,
                    zip,
                    password,
                    vcode,
                    userType
                }]
                
               
                emailer(email,vcode);
                res.send({message:"Verification Code Sent to your email", udata:user});

            }
            catch(err){
                console.log("error in sending verification", err)
            }

        })

    
})

router.post('/signup',async (req,res)=>{
    //res.send("this is sign up page 2");
    //console.log("sent by client ",req.body)

    const{firstname,lastname,dob,phoneno,email,address,zip,userType,password} = req.body;
    
    
                const user =new User({
                    firstname,
                    lastname,
                    dob,
                    phoneno, 
                    email,
                    address,
                    zip,
                    userType,
                    password
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


router.post('/signin', async (req,res) => {
    const {email,password} = req.body;
    if (!email || !password){
        return res.status(422).json({error:"Please add email or password"});
    }
    const saveduser= await User.findOne({email:email})

    console.log(saveduser);
    console.log(password, saveduser.password)
    
    if (!saveduser){
        
        return res.status(422).json({error:"User does not exist"});
    }
    try {
        bcrypt.compare(password, saveduser.password, (err, result) => {
            //console.log(result)
            if (result){
                console.log("password matched");
                const token = jwt.sign({_id:saveduser._id},process.env.jwt_secret);
                const userType =  saveduser.userType;
                //console.log(userType)
                const newUser = password.startsWith("#new#")?1:0; 
                const id= saveduser._id
                res.send({token,userType,newUser,id});
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

router.put('/createpw/:id',async (req, res) => {
    const userID = req.params.id
    const { oldpassword,newpassword } = req.body
    
    try{
        const user = await User.findById(userID);
        if (!user) {
            return res.status(404).send({ error: "User Not found" });
          }
        bcrypt.compare(oldpassword, user.password,async (err, result) => {
            //console.log(result);
            if(result){
                
                if (oldpassword == newpassword){
                    return res.send({ error: "New Password can not be same is old password" })
                }
                user.password = newpassword;
                await user.save();
                return res.send({ message: "Password updated successfully" })

            }
            else{
                return res.send({ error: "Incorrect Old Password" });
            }
        })
    }
    catch(err){
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }


})

router.post('/userapprove', (req,res)=> {
    const{firstname,lastname,dob,phoneno,email,address,zip,userType} = req.body;

    User.findOne({email:email})
    .then( async (result) =>{
        if (result){
            
            return res.status(422).send({error:"User already registered"});
        }
        try{

            
            Userapprove.findOne({email:email})
            .then( async (result) =>{
                try{

                    if (result){
                        return res.status(422).send({error:"User already registered and waiting for approval"});
                    }
                    let vcode = Math.floor(100000 + Math.random()*900000);
                password = `#new#${vcode}`
    
                const user =new Userapprove({
                    firstname,
                    lastname,
                    dob,
                    phoneno,
                    email,
                    password,
                    address,
                    zip,
                    userType
                })
                console.log(user);
                await user.save();
                res.send({message:"Your Details has been sent for Verification"});
                }catch(err){
                    console.log("error in sending verification while in Userapprove schema", err)
                }
            }
            )

        }
        catch(err){
            console.log("error in sending verification while in User schema", err)
        }

    })

})







//Admin AdminAdmin AdminAdmin AdminAdmin AdminAdmin AdminAdmin AdminAdmin AdminAdmin AdminAdmin AdminAdmin AdminAdmin AdminAdmin Admin



router.get('/userapprovallist',async (req,res)=>{

    userlist= await Userapprove.find()
    res.send({userlist})
})

router.delete('/deleteuser/:_id',async (req,res) => {
    const userId = req.params;
    //console.log(userId);
    try{
        deleteUser = await Userapprove.findByIdAndDelete(userId._id);

        if(!deleteUser){
            return res.send({error:"User Not found"})
        }
        userlist= await Userapprove.find()
        return res.send({message:"User Registration rejected",userlist})

    }catch(err){
        console.log(err);
        return res.json({error:"Server error"})
    }
})

router.delete('/deleteuseradmin/:_id',async (req,res) => {
    const userId = req.params;
   
    try{
        deleteUser = await User.findByIdAndDelete(userId._id);

        if(!deleteUser){
            return res.send({error:"User Not found"})
        }
        userlist= await User.find({userType: {$ne:"Admin"}})
        return res.send({message:"User Deleted",userlist})

    }catch(err){
        console.log(err);
        return res.json({error:"Server error"})
    }
})

router.get('/getallusers',async (req,res)=>{

    userlist= await User.find({userType: {$ne:"Admin"}})
    res.send({userlist})
})



router.delete('/adduser/:_id',async (req,res) => {
    const userId = req.params._id;
    //console.log(userId);
    try{
        userdetails = await Userapprove.findById(userId);
        //console.log(userdetails);
        const user =new User({
            firstname:userdetails.firstname,
            lastname:userdetails.lastname,
            dob:userdetails.dob,
            phoneno:userdetails.phoneno, 
            email:userdetails.email,
            password:userdetails.password,
            address:userdetails.address,
            zip:userdetails.zip,
            userType:userdetails.userType,
        })
                await user.save();

                deleteUser = await Userapprove.findByIdAndDelete(userId);

                if(!deleteUser){
                    return res.send({error:"User Not found"})
                }
                userlist= await Userapprove.find()
                emailer(userdetails.email,userdetails.password,userdetails.userType);
                return res.send({message:"User registered successfully and user credentials are sent over user email",userlist});

    }catch(err){
        console.log(err);
        return res.json({error:"Server error"})
    }
})

router.delete('/adduser/:_id',async (req,res) => {
    const userId = req.params._id;
    //console.log(userId);
    try{
        userdetails = await Userapprove.findById(userId);
        //console.log(userdetails);
        const user =new User({
            firstname:userdetails.firstname,
            lastname:userdetails.lastname,
            dob:userdetails.dob,
            phoneno:userdetails.phoneno, 
            email:userdetails.email,
            password:userdetails.password,
            address:userdetails.address,
            zip:userdetails.zip,
            userType:userdetails.userType,
        })
                await user.save();

                deleteUser = await Userapprove.findByIdAndDelete(userId);

                if(!deleteUser){
                    return res.send({error:"User Not found"})
                }
                userlist= await Userapprove.find()
                emailer(userdetails.email,userdetails.password,userdetails.userType);
                return res.send({message:"User registered successfully and user credentials are sent over user email",userlist});

    }catch(err){
        console.log(err);
        return res.json({error:"Server error"})
    }
})

router.post('/docsignup',  (req,res) => {

    const{firstname,lastname,phoneno,email,speciality,userType} = req.body;
    
    //console.log(speciality)
    User.findOne({email:email})
    .then( async (result) =>{
            if (result){
                return res.status(422).send({error:"User already exists"});
            }
            try{
                let vcode = Math.floor(100000 + Math.random()*900000);
                const password = `#new#${vcode}`
                
                const user =new User({
                    firstname,
                    lastname,
                    phoneno, 
                    email,
                    speciality,
                    userType,
                    password
                })
                
                    //console.log(user)
                    await user.save();
                    emailer(email,password,userType);
                    return res.send({message:"Doctor Registered Successfully"});
                
            }
            catch(err){
                console.log("error in docsignup", err)
            }

        })

})


//Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor Doctor 

router.post('/DoctorCheckIn',requesttoken,async (req,res) => {
 const {appointments} = req.body
 console.log(req.body);

 try{
    const recordexists= await DocAppointments.findOne({ doc_id: req.user._id });
    if (!recordexists){
        const appoint = new DocAppointments({
            avail_appointment:appointments,
            doc_id: req.user._id
        })
        await appoint.save();
    }
    else{
        recordexists.avail_appointment =appointments;
        await recordexists.save()
    }
    return res.send({message:"Doctor's Appointment Availability has been checked in", appointments:recordexists.avail_appointment});

 }catch(err){
    res.send({error:"error checking in appointment"})
    console.log(err)
 }
})

router.get('/ExistingAvailability',requesttoken,async (req,res)=>{

    const appointments = await DocAppointments.findOne({doc_id:req.user._id})
    if(!appointments){
        res.send({appointments: {}})
    }else{

        res.send({appointments: appointments.avail_appointment})
    }


})


router.post('/getdailyapt',requesttoken, async (req,res)=>{

    const currentDate = new Date();
    
    try{

        const appointments = await Bookings.find({
            doctor:req.user._id,
            date: currentDate.toISOString().split('T')[0], 

        }).populate({
            path: 'patient',
            select: 'firstname lastname dob',
        })
        .exec();

        if(!appointments){

            res.send({appointments: {}})
        }else{
            
    
            console.log(appointments)
            appointments.sort((a, b) => {

                const timeA = a.time.split(':').map(Number);
                const timeB = b.time.split(':').map(Number);
                a.time=timeA[0]+":"+timeA[1];
                b.time=timeB[0]+":"+timeB[1];
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateB - dateA;
            });
            
          res.send({appointments})
        }

    }catch(err){
        console.log(err);
        return res.send({error:"Internal Server Error"})
    }

   
})


router.post('/getcancelledapt',requesttoken, async (req,res)=>{

    const currentDate = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(currentDate.getDate() - 7);
    
    try{

        const appointments = await Bookings.find({
            doctor:req.user._id,
            date: {
                $gte: sevenDaysAgo.toISOString().split('T')[0], 
                $lte: currentDate.toISOString().split('T')[0], 
            },
            status:"Cancelled"

        }).populate({
            path: 'patient',
            select: 'firstname lastname dob',
        })
        .exec();

        if(!appointments){

            res.send({appointments: {}})
        }else{
            
    
            console.log(appointments)
            appointments.sort((a, b) => {

                const timeA = a.time.split(':').map(Number);
                const timeB = b.time.split(':').map(Number);
                a.time=timeA[0]+":"+timeA[1];
                b.time=timeB[0]+":"+timeB[1];
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateB - dateA;
            });
            
          res.send({appointments})
        }

    }catch(err){
        console.log(err);
        return res.send({error:"Internal Server Error"})
    }

   
})



router.post('/getpastapt',requesttoken, async (req,res)=>{

    const currentDate = new Date();
    const DaysAgo = new Date();
    DaysAgo.setDate(currentDate.getDate() - 14);
    
    try{

        const appointments = await Bookings.find({
            doctor:req.user._id,
            date: {
                $gte: DaysAgo.toISOString().split('T')[0], 
                $lte: currentDate.toISOString().split('T')[0], 
            },
            status:"Past",

        }).populate({
            path: 'patient',
            select: 'firstname lastname dob',
        })
        .exec();

        if(!appointments){

            res.send({appointments: {}})
        }else{
            appointments.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA;
            });
    
           // Sort appointments by date
        //    appointments.sort((a, b) => {
        //     const dateA = new Date(a.date);
        //     const dateB = new Date(b.date);
            
        //     return dateA - dateB;
        // });

       //console.log(appointments)
        appointments.sort((a, b) => {
            if (a.date === b.date) {
                const timeA = a.time.split(':').map(Number);
                const timeB = b.time.split(':').map(Number);
                if (timeA[0] !== timeB[0]) {
                    return timeA[0] - timeB[0];
                }
                return timeA[1] - timeB[1];
            }
            return 0;
        });


            
          res.send({appointments})
        }

    }catch(err){
        console.log(err);
        return res.send({error:"Internal Server Error"})
    }

   
})


// Patient PatientPatient PatientPatient PatientPatient PatientPatient PatientPatient PatientPatient PatientPatient PatientPatient PatientPatient Patient

router.post('/sendfeedback', async (req, res)=>{

    const {rating, feedback, aptid} = req.body;
    const apt = await Bookings.findById(aptid);
    console.log(apt);
    try{
        if(apt.rating && apt.feedback){
            apt.rating = rating;
            apt.feedback = feedback;
            await apt.save();
            return res.send({message:"Feedback Updated"});
        }else{
            
            apt.rating = rating;
            apt.feedback = feedback;
            await apt.save();
            return res.send({message:"Feedback Submitted"})
        }
        
    }catch(err){
        console.error(err);
        res.send({ error: 'Internal Server Error' });   
    }

})



router.get('/getdocs', async (req,res) =>{
    try {
        const docs = await DocAppointments.find();
        
        if (docs.length > 0) {
          const alldocs =await Promise.all( docs.map(async (doc) => {
            const docId = doc.doc_id;

            const currentDate = new Date();
            
            const availApt = Object.keys(doc.avail_appointment)
            .filter((date) => new Date(date).toISOString().split('T')[0] >= currentDate.toISOString().split('T')[0])
            .reduce((result, date) =>{
                const filteredSlots = doc.avail_appointment[date].filter((slot) => {
                    const [hour, minute] = slot.split(':').map(Number);
                    const slotTime = new Date(date);
                    slotTime.setHours(hour, minute, 0, 0);
                    return currentDate < slotTime; 
                  });
                result[date] = filteredSlots;
                return result;
            },{});
            
            doc.avail_appointment= availApt
            await doc.save();
            //console.log(doc.avail_appointment)
            const availAppointments = doc.avail_appointment;
           
            const docdetails= await User.findById(docId);
            return { docid:docdetails._id, docname:`${docdetails.firstname} ${docdetails.lastname}`, availAppointments };
          })
          );

          res.send({alldocs});
        } else {
          res.send([]); 
        }

      } catch (err) {
        console.error(err);
        res.send({ error: 'Internal Server Error' });
      }
} )

router.post('/confirmbooking',requesttoken,async (req,res)=>{

    const patient = req.user._id
    const {doctor,date, time, sym, desc} = req.body

    try {
       
        const bookings= await Bookings.findOne({ doctor, date, time });

        if (bookings){
            return res.send({error:"Booking already exists"})
        }

        const apt = new Bookings({
            doctor,
            date,
            time,
            sym,
            desc,
            patient
        });
        await apt.save();
        
        const recordexists= await DocAppointments.findOne({ doc_id: doctor });

        if (recordexists){
            const updateAvailApt = {
                ...recordexists.avail_appointment,
                [date]: recordexists.avail_appointment[date].filter(slot => slot != time),
            }
            recordexists.avail_appointment=updateAvailApt
            await recordexists.save()
        }

        return res.send({message:"Booking bas been made, please check summary tab"})

      } catch (err) {
        console.error(err);
        res.send({ error: 'Internal Server Error' });
      }



})

router.post('/deleteapt', async (req, res) =>{

    const {id} =req.body
    const patientBooking = await Bookings.findById(id)

    try{

        if (patientBooking){
            patientBooking.status="Deleted";
            await patientBooking.save()
            const appointments = await Bookings.find({patient:patientBooking.patient})
            return res.send({message:"Appointment cancelled and deleted." , appointments })
        }
        else{
            return res.send({message:"Appontment doesn't exists"})
        }


    }catch(err){
        console.error(err);
        res.send({ error: 'Internal Server Error' });   
    }

})

router.post('/getuserdetails',requesttoken, async (req,res) => {

    const user = req.user._id
    const userDetails = await User.findById(user);
    
    try{

        const userdata = {
            name: `${userDetails.firstname} ${userDetails.lastname}`,
            email: userDetails.email,
            pno: userDetails.phoneno,
            zipcode: userDetails.zip,
            userType:userDetails.userType,
            speciality:userDetails.speciality,
            address:userDetails.address

        }

        return res.send({userdata})

    }catch(err){
        console.log(err);
        res.send({ error: 'Internal Server Error' });   
    }

})

    // router.post('/deleteapt', async (req, res) =>{

    //     const {id} =req.body
    //     const patientBooking = await Bookings.findById(id)

    //     try{

    //         if (patientBooking){
    //             patientBooking.status="Deleted";
    //             await patientBooking.save()
                
    //         return res.send({message:"Success"})

    //         }
    //         else{
    //             return res.send({message:"Appontment doesn't exists"})
    //         }


    //     }catch(err){
    //         console.error(err);
    //         res.send({ error: 'Internal Server Error' });   
    //     }

    // })


router.post('/cancelapt', async (req, res) =>{

    const {id} =req.body
    const patientBooking = await Bookings.findById(id);
    const currentDate = new Date();
    const aptdate =  new Date(patientBooking.date);

    try{

        if (patientBooking && currentDate.toISOString().split('T')[0] < aptdate.toISOString().split('T')[0] ){

            patientBooking.status="Cancelled";
            const appointments = await DocAppointments.findOne({doc_id:patientBooking.doctor});
            appointments.avail_appointment[patientBooking.date].push(patientBooking.time)
            
            await appointments.save()
            await patientBooking.save()
          return res.send({message:"Appointment canceled, please book new appointment"})

        }
        else{
            return res.send({message:"Appointment of the same date can not be cancelled"});
        }


    }catch(err){
        console.error(err);
        res.send({ error: 'Internal Server Error' });   
    }

})


router.post('/getappointments',requesttoken, async (req, res) => {

    const patientBookings = await Bookings.find({patient :  req.user._id});

    const {filter} = req.body
    try {
        if (patientBookings.length > 0) {
            const appointments = await Promise.all( patientBookings.map(async (booking) => {
            const docId = booking.doctor;
            const docdetails= await User.findById(docId)


            const appointmentDateTime = new Date(booking.date + ' ' + booking.time);
            const currentDateTime = new Date();
            if (currentDateTime > appointmentDateTime) {
                if (booking.status === "Active") {
                    await Bookings.findByIdAndUpdate(booking._id, { status: "Past" });
                }
            }
            return {  docid:docdetails._id, docname:`${docdetails.firstname} ${docdetails.lastname}`,docspl:docdetails.speciality, sym:booking.sym, date:booking.date, time: booking.time, description: booking.desc, status:booking.status?booking.status:"Active",id:booking._id };
          })
          );


          let filteredAppointments = appointments;
            if (filter) {
                filteredAppointments = appointments.filter((appointment) => appointment.status === filter);
            }

          // Sort the appointments by date and time
          if (filter=="Active"){
            filteredAppointments.sort((a, b) => {
                const dateA = new Date(a.date + ' ' + a.time);
                const dateB = new Date(b.date + ' ' + b.time);
              
                return dateA - dateB;
            });
            
          }else{
            filteredAppointments.sort((a, b) => {
                const dateA = new Date(a.date + ' ' + a.time);
                const dateB = new Date(b.date + ' ' + b.time);
              
                return dateB - dateA;
            });
          }
          
       
         
          res.send({appointments:filteredAppointments});
        } else {
          res.send({appointments:[]}); 
        }
    }
    catch(err){
        console.error(err);
        res.send({ error: 'Internal Server Error' });
    }

}  )

router.post('/bookemergencyapt',requesttoken,async (req, res) => {

    const patient = req.user._id
    const {docType, time } = req.body

    try {
       
       // const bookings= await Bookings.findOne({ doctor, time });
       const docs = await DocAppointments.find()
            .populate('doc_id', 'speciality')
            .exec();

        const filteredDocs = docs.filter(doc => doc.doc_id.speciality === docType);

            let nDate = null;
            let nSlot = null;
            let docid = null;
            
            let currentTime = new Date().getTime();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
    
            filteredDocs.forEach(doc => {
                Object.keys(doc.avail_appointment).forEach(date=>{
                    if (new Date(date) >= today) {

                    const currentDate = new Date(date);
    
                    doc.avail_appointment[date].forEach(slot => {
    
                        const [slotHours, slotMinutes] = slot.split(":");
                        const slotTime = new Date(date).setHours(slotHours, slotMinutes);
    
                        if (slotTime > currentTime &&((!nDate || currentDate < nDate) ||
                        (currentDate === nDate && slotTime <= currentTime))
                            
                        ) {
                            nDate = currentDate;
                            nSlot = slot;
                            currentTime = slotTime;
                            docid= doc.doc_id
                        }
    
                    });
    
                }
                
                })
            })
    
            //console.log(nDate,nSlot)
            if (!nDate || !nSlot || !docid) {
                return res.send({ message: "No available appointments found" });
            }
    
            const apt = new Bookings({
                doctor:docid,
                date:nDate.toISOString().split('T')[0],
                time:nSlot,
                sym:"Emergency Appointment",
                desc:"Emergency Appointment",
                patient
            });
            await apt.save();
            //console.log(apt)
            const date= nDate.toISOString().split('T')[0];
            const recordexists= await DocAppointments.findOne({ doc_id: docid });
    
            if (recordexists){
                const updateAvailApt = {
                    ...recordexists.avail_appointment,
                    [date]: recordexists.avail_appointment[date].filter(slot => slot != nSlot),
                }
                recordexists.avail_appointment=updateAvailApt
                await recordexists.save()
            }
    
            return res.send({message:"Booking bas been made, please check summary tab"})
        

      } catch (err) {
        console.error(err);
        res.send({ error: 'Internal Server Error' });
      }


} )




// Chat Chat Chat Chat Chat ChatChat Chat ChatChat Chat ChatChat Chat ChatChat Chat ChatChat Chat ChatChat Chat ChatChat Chat ChatChat Chat Chat

router.post('/savechat', async (req,res) => {
    const {sender, receiver, roomid, message} = req.body;

    console.log(req.body)
    
    try {
        const newMsg = new Chat({
            sender,
            receiver,
            roomid,
            message,
        })
        await newMsg.save();
        res.send({message:"Message Saved"})
    }
    catch(err){
        console.log("Error in /savechat", err);
        res.send({error:"Internal Server Error"})
    }
})

router.post('/getchathistory', async (req, res) => {
    const {roomid} = req.body;
    Chat.find({roomid:roomid})
    .then(message=>{
        res.send(message)
    })
    .catch(err =>{
        console.log("error getting the chat history",err)
    })
})

router.post('/userdetails',requesttoken, async (req, res) => {

    const {id} = req.body 
    const user1 = req.user._id
    const user2 = id
    try {
        
        res.send({message:"Success", user1, user2 })
    }
    catch(err){
        console.log(err);
        res.send({error:"Internal Server Error"})
    }

})

router.post('/getChats',requesttoken, async (req,res) => {

    const user1 = req.user._id;
    const regexPattern = new RegExp(`.*${user1}.*`);
    const Chatlist = [];

    try {
        const chat = await Chat.find({ roomid: { $regex: regexPattern } }).distinct('roomid');
        //console.log(chat)
        for (const roomid of chat) {
            let user2;
            const [id1, id2] = roomid.split('$');
            if (id1 != user1){
                 user2 = await User.findById(id1);
                 console.log(user2)
                 
            }
            else {
                 user2 = await User.findById(id2);
                 
            }
            console.log(id1,id2)
            if (user2) {
                Chatlist.push({
                chatname: `${user2.firstname} ${user2.lastname}`,
                id:user2._id,

              });
            }

            
          }
          console.log(Chatlist)
        res.send({Chatlist,message:"Success"})
    }
    catch(err){
        console.log(err);
        res.send({error:"Internal Server Error"})
    }

})


module.exports = router;