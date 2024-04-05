
const mangoose =require('mongoose');

const userSchema = new  mangoose.Schema({
    doc_id: {
        type: mangoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    avail_appointment: {
        type: Object,
        required: true,
    },
})



mangoose.model("docAppointments",userSchema);