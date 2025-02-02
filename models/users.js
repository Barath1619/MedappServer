
const mangoose =require('mongoose');
const bcrypt =require('bcrypt');

const userSchema = new  mangoose.Schema({
    firstname: {
        type: String,
        required: true,
    },
    lastname: {
        type: String,
        required: true,
    },
    dob: {
        type: String,
        required: false,
    },
    phoneno: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    conemail: {
        type: String,
        required: false,
    },
    address: {
        type: String,
        required: false,
    },
    zip: {
        type: String,
        required: false,
    },
    password: {
        type: String,
        required: false,
    },
    userType: {
        type: String,
        required: true,
    },
    speciality:{
        type: String,
        required: false,
    }
   
})

userSchema.pre("save", async function(next){
    const user = this;
    if(this.isModified('password'))return next()

    console.log(user.password,user.email)
    user.password = await bcrypt.hash(user.password,8);
    next();

})

mangoose.model("users",userSchema);