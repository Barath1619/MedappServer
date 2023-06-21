
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
        required: true,
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
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    zip: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: false,
    }
})

userSchema.pre("save", async function(next){
    const user = this;
    //console.log("just before saving and hashing ", user.conemail);
    if (!user.isModified('conemail') ){
        return next()
    }
    user.conemail = await bcrypt.hash(user.conemail,8);
    //console.log("just before saving and after hashing", user.conemail)
    next();

})

mangoose.model("users",userSchema);