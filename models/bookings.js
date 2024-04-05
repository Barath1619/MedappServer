
const mangoose =require('mongoose');
const bcrypt =require('bcrypt');

const userSchema = new  mangoose.Schema({
    patient: {
        type:  mangoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    doctor: {
        type:  mangoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    date: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    sym: {
        type: String,
        required: true,
    },
    desc: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: false
    },
    deleted:{
        type: Boolean,
        default:false,
    },
    rating:{
        type:Number,
        require:false,
    },
    feedback:{
        type:String,
        require:false,
    }
})

userSchema.pre("save", async function(next){
    const booking = this;
    if(!booking.status){
        booking.status = "Active";
    }
    console.log(booking)
    next();

})


mangoose.model("bookings",userSchema);