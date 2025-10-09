
// const mongoose=require("mongoose")

// const {Schema}=mongoose;


// const addressSchema= new Schema({
//     userId:{
//         type:Schema.Types.ObjectId,
//         ref:"User",
//         required:true
//     },
//     address:[{
//         addressType:{
//              type:String,
//              required:true
//         },
//         name:{
//             type:String,
//             required:true,
//         },
//         city:{
//             type:String,
//             required:true
//         },
//         landmMark:{
//             type:String,
//             required:true
//         },
//         state:{
//             type:String,
//             required:true
//         },
//         pincode:{
//             type:Number,
//             required:true
//         },
//         phone:{
//             type:String,
//             required:true
//         }      
//     }]
// })

// const Address=mongoose.model("Address",addressSchema)

// module.exports=Address;


// const mongoose = require('mongoose');

// const addressSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   address: [{
//     addressType: {
//       type: String,
//       required: true,
//       enum: ['Home', 'Work', 'Other']
//     },
//     name: {
//       type: String,
//       required: true,
//       minlength: 3
//     },
//     phone: {
//       type: String,
//       required: true,
//       match: [/^\d{10}$/, 'Phone number must be exactly 10 digits']
//     },
//     houseName: {
//       type: String,
//       required: true,
//       minlength: 2
//     },
//     buildingNumber: {
//       type: String,
//       required: false
//     },
//     landmark: {
//       type: String,
//       required: true,
//       minlength: 3
//     },
//     altPhone: {
//       type: String,
//       required: false,
//       match: [/^\d{10}$/, 'Alternative phone number must be exactly 10 digits']
//     },
//     nationality: {
//       type: String,
//       required: true,
//       minlength: 2
//     },
//     city: {
//       type: String,
//       required: true
//     },
//     state: {
//       type: String,
//       required: true
//     },
//     pincode: {
//       type: String,
//       required: true
//     },
//     isDefault: {
//       type: Boolean,
//       default: false
//     }
//   }]
// });

// module.exports = mongoose.model('Address', addressSchema);




const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  address: [{
    addressType: { type: String, enum: ['Home', 'Work', 'Other'], required: true },
    name: { type: String, required: true, minlength: 3 },
    phone: { type: String, required: true, match: /^\d{10}$/ },
    houseName: { type: String, default: "Unknown" }, // Optional with default
    buildingNumber: { type: String },
    landmark: { type: String, required: true, minlength: 3 },
    altPhone: { type: String, match: /^\d{10}$/ },
    nationality: { type: String, default: "Unknown" }, // Optional with default
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
  }]
});

module.exports = mongoose.model('Address', addressSchema);