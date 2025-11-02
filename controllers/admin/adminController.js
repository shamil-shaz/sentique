
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
    if (!admin || admin.isBlocked) {
      return res.render('admin-login', { message: 'Invalid credentials or blocked' });
    }


    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.render('admin-login', { message: 'Invalid credentials' });
    }

    req.session.admin = {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: 'admin',
    };

   
    admin.lastLogin = new Date();
    await admin.save();

    return res.redirect('/admin/dashboard');
  } catch (err) {
    console.error("Admin Login Error:", err);
    return res.redirect('/pageerror');
  }
};






const logout = (req, res) => {
  try {
   
    if (req.session.admin) {
      delete req.session.admin;
    }


    return res.redirect('/admin/login');
  } catch (error) {
    console.log("Unexpected error during admin logout:", error);
    return res.redirect('/pageerror');
  }
};



module.exports = {
  loadLogin,
  verifyLogin,
  logout,
  pageerror,
};


