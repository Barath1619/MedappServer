
const mangoose =require('mongoose');
const bcrypt =require('bcrypt');

const chatSchema = new  mangoose.Schema({
    sender: {
        type: String,
        required: true,
    },
    receiver: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: false,
    },
    roomid: {
        type: String,
        required: true,
    }
    
},{
    timestamps:true,
})

mangoose.model("Chat",chatSchema);