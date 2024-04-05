
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
    }
})



mangoose.model("approval",userSchema);