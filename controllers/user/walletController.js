const mongoose = require("mongoose");
const Wallet = require("../../models/walletSchema");
const User = require("../../models/userSchema");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const generateShortReceipt = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 7);
  const receipt = `ord_${timestamp}${random}`;
  return receipt;
};

const getWalletPage = async (req, res) => {
  try {
    
    const userId = req.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Invalid or missing user ID:", userId);
      return res.redirect("/login");
    }

    let wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      wallet = await new Wallet({ user: userId }).save();
    }

    const userData = await User.findById(userId).lean();

    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const startIndex = (page - 1) * limit;

    const allTransactions = wallet.transactions || [];
    const totalTransactions = allTransactions.length;
    const totalPages = Math.ceil(totalTransactions / limit) || 1;

    const reversedTransactions = [...allTransactions].reverse();

    const paginatedTransactions = reversedTransactions
      .slice(startIndex, startIndex + limit)
      .map((t, index) => ({
        serialNo: startIndex + index + 1,
        id: t._id.toString(),
        type: t.type,
        amount: parseFloat(t.amount).toFixed(2),
        date: new Date(t.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        time: new Date(t.date).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        description: t.description,
        reason: t.reason || "",
        details: t.details || "",
        orderId: t.orderId || "N/A",
        productName: t.productName || "",
      }));

    const walletData = {
      balance: parseFloat(wallet.balance || 0).toFixed(2),
      totalCredits:
        allTransactions
          .filter((t) => t.type === "credit")
          .reduce((a, t) => a + parseFloat(t.amount || 0), 0)
          .toFixed(2) || "0.00",
      totalDebits:
        allTransactions
          .filter((t) => t.type === "debit")
          .reduce((a, t) => a + parseFloat(t.amount || 0), 0)
          .toFixed(2) || "0.00",
      monthlyTotal:
        allTransactions
          .filter((t) => new Date(t.date).getMonth() === new Date().getMonth())
          .reduce(
            (a, t) =>
              a +
              (t.type === "credit"
                ? parseFloat(t.amount || 0)
                : -parseFloat(t.amount || 0)),
            0
          )
          .toFixed(2) || "0.00",
      transactionCount: allTransactions.length,
    };

    res.render("wallet", {
      customerName: userData.name || "Guest",
      walletData,
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages,
      totalTransactions,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      user: req.user || req.session.user || null
    });
  } catch (error) {
    console.error("Error fetching wallet page:", error);
    res.redirect("/pageNotFound");
  }
};

const getWalletData = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      wallet = await new Wallet({ user: userId }).save();
    }

    const allTransactions = wallet.transactions || [];
    const walletData = {
      balance: parseFloat(wallet.balance || 0).toFixed(2),
      totalCredits:
        allTransactions
          .filter((t) => t.type === "credit")
          .reduce((a, t) => a + parseFloat(t.amount || 0), 0)
          .toFixed(2) || "0.00",
      totalDebits:
        allTransactions
          .filter((t) => t.type === "debit")
          .reduce((a, t) => a + parseFloat(t.amount || 0), 0)
          .toFixed(2) || "0.00",
      monthlyTotal:
        allTransactions
          .filter((t) => new Date(t.date).getMonth() === new Date().getMonth())
          .reduce(
            (a, t) =>
              a +
              (t.type === "credit"
                ? parseFloat(t.amount || 0)
                : -parseFloat(t.amount || 0)),
            0
          )
          .toFixed(2) || "0.00",
      transactionCount: allTransactions.length,
      totalPages: Math.ceil(allTransactions.length / 8) || 1,
    };

    res.json(walletData);
  } catch (error) {
    console.error("Error fetching wallet data:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getPaginatedTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const filter = req.query.filter || "all";
    const limit = 8;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      return res.json({
        transactions: [],
        totalPages: 1,
        totalTransactions: 0,
      });
    }

    let transactions = wallet.transactions || [];

    if (filter !== "all") {
      transactions = transactions.filter((t) => t.type === filter);
    }

    const totalTransactions = transactions.length;
    const totalPages = Math.ceil(transactions.length / limit) || 1;

    const reversedTransactions = [...transactions].reverse();
    const startIndex = (page - 1) * limit;

    const paginatedTransactions = reversedTransactions
      .slice(startIndex, startIndex + limit)
      .map((t, index) => ({
        serialNo: startIndex + index + 1,
        id: t._id.toString(),
        type: t.type,
        amount: parseFloat(t.amount).toFixed(2),
        date: new Date(t.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        time: new Date(t.date).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        description: t.description,
        reason: t.reason || "",
        details: t.details || "",
        orderId: t.orderId || "N/A",
        productName: t.productName || "",
      }));

    res.json({
      transactions: paginatedTransactions,
      totalPages,
      totalTransactions,
      currentFilter: filter,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const createAddMoneyOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { amount } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    const amountInPaise = Math.round(parseFloat(amount) * 100);
    const receipt = generateShortReceipt();

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: receipt,
      notes: {
        userId: userId.toString(),
        type: "wallet_topup",
      },
    });

    console.log(" Razorpay order created:", razorpayOrder.id);

    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
    });
  }
};

const verifyAddMoneyPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = new Wallet({ user: userId });
    }

    const numAmount = parseFloat(amount);
    wallet.balance += numAmount;

    wallet.transactions.push({
      type: "credit",
      amount: numAmount,
      description: "Add Money",
      orderId: razorpay_payment_id,
      date: new Date(),
    });

    await wallet.save();

    console.log(" Payment verified:", {
      amount: numAmount,
      balance: wallet.balance,
    });

    res.json({
      success: true,
      message: "Money added successfully",
      newBalance: wallet.balance.toFixed(2),
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

const recordFailedPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, orderId, paymentId, errorCode, errorDescription } =
      req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    console.log("📝 Recording failed payment:", { userId, amount, errorCode });

    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = new Wallet({ user: userId });
    }

    wallet.transactions.push({
      type: "failed",
      amount: parseFloat(amount),
      description: "Payment Failed",
      reason: errorDescription || errorCode,
      orderId: paymentId || orderId,
      date: new Date(),
    });

    await wallet.save();

    console.log("Failed payment recorded");

    res.json({
      success: true,
      message: "Payment failure recorded",
    });
  } catch (error) {
    console.error("Error recording failed payment:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to record payment" });
  }
};

const addTestTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.userId;
    const { type, amount, description, productName, orderId, reason } =
      req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    const validDescriptions = [
      "Refund",
      "Return",
      "Referral",
      "Add Money",
      "Purchase",
      "Order Cancellation",
      "Cashback",
      "Payment Failed",
    ];
    if (!validDescriptions.includes(description)) {
      return res.status(400).json({ error: "Invalid description" });
    }

    wallet.transactions.push({
      type,
      amount: parseFloat(amount),
      description,
      reason: reason || null,
      orderId: orderId || "N/A",
      productName: productName || null,
      date: new Date(),
    });

    if (type === "credit") {
      wallet.balance += parseFloat(amount);
    } else if (type === "debit") {
      wallet.balance -= parseFloat(amount);
    }

    await wallet.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.json({ message: "Transaction added" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getWalletPage,
  getWalletData,
  getPaginatedTransactions,
  createAddMoneyOrder,
  verifyAddMoneyPayment,
  recordFailedPayment,
  addTestTransaction,
};
