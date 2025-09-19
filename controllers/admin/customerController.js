
const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = 4;

    const filter = {
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    };

    const userData = await User.find(filter)
      .sort({createdOn:-1})
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments(filter);

    res.render("customers", {
      users: userData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      search,
    });
  } catch (error) {
    console.error("Error in customerInfo:", error);
    res.render("pageerror", { error: "Something went wrong!" });
  }
};

const customerBlocked =async (req,res)=>{
  try{
    let id =req.query.id;

    await User.updateOne({_id:id},{$set:{isBlocked:true}});
    res.redirect('/admin/customers');

  }catch(error){
    res.redirect("/pageerror")
  }
}

const customerunBlocked =async (req,res)=>{

  try {
    let id =req.query.id;
    await User.updateOne({_id:id},{$set:{isBlocked:false}});
    res.redirect("/admin/customers")
  } catch (error) {

    res.redirect("/pageerror")
    
  }
}


module.exports = {
  customerInfo,
  customerBlocked,
  customerunBlocked,
};
