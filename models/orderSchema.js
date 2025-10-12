// const mongoose=require('mongoose')

// const {Schema}=mongoose;

// const {v4:uuidv4, stringify}=require('uuid');

// const orderSchema= new Schema({
//     orderId:{
//         type:String,
//         default:()=>uuidv4(),
//         unique:true
//     },
//     orderItems:[{
//         product:{
//             type:Schema.Types.orderId,
//             ref:'Product',
//             required:true
//         },
//         quantity:{
//             type:Number,
//             default:0
//         }
//     }],

//     totalPrice:{
//         type:Number,
//         required:true
//     },
//     discount:{
//         type:Number,
//         default:0
//     },
//     finalAmount:{
//         type:Number,
//         required:true
//     },
//     address:{
//         type:Schema.Types.ObjectId,
//         ref:"User",
//         required:true

//     },
//     invoiceDate:{
//         type:Date

//     },

//     status:{
//         type:String,
//         required:true,
//         enum:['Pending',"Processing","Deliverd","Canecelled","Return Request","Returned"]
//     },
//     createdOn:{
//         type:Date,
//         default:Date.now,
//         required:true
//     },
//     couponApplied:{
//         type:Boolean,
//         default:false
//     }


// })

// const Order=mongoose.model("Order",orderSchema)
// module.exports=Order;



const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    index: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      productName: {
        type: String,
        required: true,
      },
      variantSize: {
        type: String,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        required: true,
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  deliveryAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    houseName: { type: String, required: true },
    buildingNumber: { type: String },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    addressType: { type: String, enum: ['Home', 'Work', 'Other'], required: true },
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['COD', 'Online Payment', 'Wallet'],
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending',
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  couponCode: {
    type: String,
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Processing', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
    default: 'Pending',
  },
});

orderSchema.index({ user: 1, createdOn: -1 });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;