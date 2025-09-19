
const User   = require('../../models/userSchema');
const bcrypt = require('bcrypt');


const pageerror=async(req,res)=>{
  res.render('pageerror')
 
}


const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', { message: null });
};

const verifyLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await User.findOne({ email, isAdmin: true });
    console.log("Admin user:", admin);

    if (!admin || admin.isBlocked) {
      return res.render('admin-login', { message: 'Invalid credentials or blocked' });
    }

    const match = await bcrypt.compare(password, admin.password);
    console.log("Password match:", match);

    if (!match) {
      return res.render('admin-login', { message: 'Invalid credentials' });
    }

    req.session.admin = admin._id;
    console.log("Session set for admin:", req.session.admin);

    res.redirect('/admin/dashboard');

  } catch (err) {
    console.error("Admin Login Error:", err);
    return res.redirect('/pageerror');
  }
};


const loadDashboard = (req, res) => {
  if (req.session.admin) {
    try {
       res.render("dashboard")
    } catch (error) {
      res.redirect("/pageerror")
    }
   
  }
 
};



const logout = (req, res) => {

  try {
    req.session.destroy(err=>{

      if(err){
        console.log("Error destroy session",err)
        return res.redirect('/pageerror')
      }
      res.redirect('/admin/login')
    })
  } catch (error) {

    console.log("unexpected error during logout",error)
    res.redirect('/pageerror')
  }
  
};


module.exports = {
  loadLogin,
  verifyLogin,
  loadDashboard,
  logout,
  pageerror,
};
