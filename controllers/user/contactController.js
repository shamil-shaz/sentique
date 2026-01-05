
const ContactMessage = require("../../models/contactSchema");
const Order = require("../../models/orderSchema"); 

const getContactPage = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;
    if (!userId) return res.redirect("/login");

    const messages = await ContactMessage
      .find({ userId })
      .sort({ createdAt: 1 });
  
    const orders = await Order.find({ user: userId })
      .select("orderId status createdOn")
      .sort({ createdOn: -1 })
      .limit(8);

    res.render("contact", { messages, orders });
  } catch (error) {
    console.error("Contact Page Error:", error);
    res.status(500).send("Server Error");
  }
};

const sendMessage = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;
    const { message, issueType } = req.body;

    const newMessage = await ContactMessage.create({
      userId,
      sender: "user",
      message: message.trim(),
      isRead: false,
    });

    return res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Send Message Error:", error);
    return res.status(500).json({ success: false });
  }
};

module.exports = { 
  getContactPage, 
  sendMessage
 };
