const User = require('../models/User');
const Transaction = require('../models/Transaction');
const sendError = require('../utils/sendError');

const MAX_TOP_UP = 5000;

// GET /api/transactions
// The signed-in user's own ledger, newest first
const listTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = { $or: [{ from: req.user._id }, { to: req.user._id }] };

    const [rows, total] = await Promise.all([
      Transaction.find(filter)
        .populate('from', 'name')
        .populate('to', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    const meId = String(req.user._id);
    const transactions = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const isIncoming = String(row.to?._id || row.to) === meId;

      transactions.push({
        _id: row._id,
        amount: row.amount,
        currency: row.currency,
        type: row.type,
        status: row.status,
        note: row.note || '',
        direction: isIncoming ? 'in' : 'out',
        counterparty: isIncoming ? row.from?.name || '' : row.to?.name || '',
        createdAt: row.createdAt,
      });
    }

    res.json({ transactions, total, page, limit, hasMore: page * limit < total });
  } catch (err) {
    sendError(res, 500, 'Failed to load transactions', err);
  }
};

// GET /api/transactions/summary
// Totals for the dashboard cards, plus the current wallet balance
const getSummary = async (req, res) => {
  try {
    const meId = req.user._id;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [incoming, outgoing, thisMonth, user] = await Promise.all([
      Transaction.find({ to: meId, status: 'completed' }).select('amount').lean(),
      Transaction.find({ from: meId, status: 'completed' }).select('amount').lean(),
      Transaction.find({
        to: meId,
        status: 'completed',
        type: 'consultation_payment',
        createdAt: { $gte: startOfMonth },
      })
        .select('amount')
        .lean(),
      User.findById(meId).select('walletBalance').lean(),
    ]);

    const sum = (rows) => {
      let total = 0;
      for (let i = 0; i < rows.length; i++) total += rows[i].amount || 0;
      return total;
    };

    res.json({
      balance: user ? user.walletBalance : 0,
      totalEarnings: sum(incoming),
      totalSpent: sum(outgoing),
      earningsThisMonth: sum(thisMonth),
      count: thisMonth.length,
      currency: 'BDT',
    });
  } catch (err) {
    sendError(res, 500, 'Failed to load the wallet summary', err);
  }
};

// POST /api/transactions/top-up
// Demo only: credits the signed-in user's own wallet. No payment is taken.
const topUp = async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Please enter an amount greater than zero' });
    }

    if (amount > MAX_TOP_UP) {
      return res.status(400).json({ message: `Demo top-ups are limited to ${MAX_TOP_UP} BDT` });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.walletBalance = (user.walletBalance || 0) + amount;
    await user.save();

    await Transaction.create({
      from: user._id,
      to: user._id,
      amount,
      type: 'top_up',
      status: 'completed',
      note: 'Demo test funds',
    });

    res.status(201).json({ balance: user.walletBalance, amount });
  } catch (err) {
    sendError(res, 500, 'Failed to add demo funds', err);
  }
};

module.exports = { listTransactions, getSummary, topUp, MAX_TOP_UP };
