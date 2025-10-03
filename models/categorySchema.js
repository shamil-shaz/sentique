const mongoose=require("mongoose");
const {Schema}=mongoose;


const categorySchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:true
    },
    image: {
        type: String, 
        default: null
    },
    imagePublicId: { type: String },
    isListed:{
        type:Boolean,
        required:true
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    createdAt:{
        type:Date,
        default:Date.now
    }

})


categorySchema.pre("save", function (next) {
  if (this.isModified("name") || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

const Category=mongoose.model("Category",categorySchema);
module.exports=Category;