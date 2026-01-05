const ContactMessage = require("../../models/contactSchema");
const User = require("../../models/userSchema");


const getContactInbox = async (req, res) => {
  try {
    const userGroups = await ContactMessage.aggregate([
      {
        $group: {
          _id: "$userId",
          lastMessageAt: { $max: "$createdAt" },
         
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$sender", "user"] }, { $eq: ["$isRead", false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

  
    const users = await Promise.all(userGroups.map(async (group) => {
      const details = await User.findById(group._id).lean();
      return {
        ...details,
        unreadCount: group.unreadCount,
        lastMessageAt: group.lastMessageAt
      };
    }));

    res.render("contact-inbox", { users });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};


const getUserChat = async (req, res) => {
  try {
    const userId = req.params.userId;
    await ContactMessage.updateMany(
      { userId: userId, sender: "user", isRead: false },
      { $set: { isRead: true } }
    );

    const messages = await ContactMessage.find({ userId }).sort({ createdAt: 1 });
    const user = await User.findById(userId);

    res.render("contact-chat", { messages, user });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};


const sendAdminMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.params.userId;

    if (!message || !message.trim()) return res.redirect("back");

    await ContactMessage.create({
      userId,
      sender: "admin",
      message: message.trim(),
      isRead: false 
    });

    res.redirect(`/admin/contact/${userId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  getContactInbox,
  getUserChat,
  sendAdminMessage
};