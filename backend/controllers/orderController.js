const mongoose = require('mongoose');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const sendError = require('../utils/sendError');
const { buildAddress } = require('../utils/address');

// The only transitions the server will perform, and who may ask for them.
// Anything not listed here is rejected.
const TRANSITIONS = {
  confirm: { from: 'pending', to: 'confirmed', actor: 'seller' },
  ready: { from: 'confirmed', to: 'ready', actor: 'seller' },
  start: { from: 'ready', to: 'delivering', actor: 'seller' },
  deliver: { from: 'delivering', to: 'delivered', actor: 'seller' },
  receive: { from: 'delivered', to: 'completed', actor: 'buyer' },
};

function shapeOrder(order, meId) {
  const buyerId = String(order.buyer?._id || order.buyer);
  const sellerId = String(order.seller?._id || order.seller);
  const me = meId ? String(meId) : '';

  const isBuyer = me === buyerId;
  const isSeller = me === sellerId;

  // What the viewer is allowed to do right now, decided on the server so the
  // UI can never offer an action the backend would refuse.
  const actions = [];
  if (isSeller && order.status === 'pending') actions.push('confirm');
  if (isSeller && order.status === 'confirmed') actions.push('ready');
  if (isSeller && order.status === 'ready') actions.push('start');
  if (isSeller && order.status === 'delivering') actions.push('deliver');
  if (isBuyer && order.status === 'delivered') actions.push('receive');

  return {
    _id: order._id,
    listing: order.listing?._id || order.listing,
    cropType: order.cropType,
    quantity: order.quantity,
    unit: order.unit,
    unitPrice: order.unitPrice,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    paymentStatus: order.paymentStatus,
    courierName: order.courierName,
    deliveryAddress: order.deliveryAddress || {},
    deliveryLatitude: order.deliveryLatitude,
    deliveryLongitude: order.deliveryLongitude,
    deliveryNote: order.deliveryNote || '',
    // The snapshot wins; the populated listing is only a fallback for orders
    // created before pickup coordinates were stored on the order itself.
    pickupLatitude: order.pickupLatitude ?? order.listing?.latitude ?? null,
    pickupLongitude: order.pickupLongitude ?? order.listing?.longitude ?? null,
    buyerName: order.buyer?.name || '',
    sellerName: order.seller?.name || '',
    buyerId,
    sellerId,
    isBuyer,
    isSeller,
    actions,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    readyAt: order.readyAt,
    deliveryStartedAt: order.deliveryStartedAt,
    deliveredAt: order.deliveredAt,
    receiptConfirmedAt: order.receiptConfirmedAt,
    paymentReleasedAt: order.paymentReleasedAt,
    completedAt: order.completedAt,
  };
}

function populatedOrder(id) {
  return Order.findById(id)
    .populate('buyer', 'name phone')
    .populate('seller', 'name phone')
    .populate('listing', 'latitude longitude')
    .lean();
}

// Accepts a latitude/longitude only when it is a real number in range,
// otherwise null. Keeps junk out of the delivery route.
function readCoordinate(value, limit) {
  if (value === undefined || value === null || value === '') return null;

  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (number < -limit || number > limit) return null;

  return number;
}

// POST /api/orders
// Checkout. The order starts as pending — delivery does NOT begin here.
const createOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.body.listingId)) {
      return res.status(400).json({ message: 'Invalid listing id' });
    }

    const listing = await Listing.findById(req.body.listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.status !== 'active') {
      return res.status(400).json({ message: 'This listing is closed' });
    }
    if (listing.farmer.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot buy your own listing' });
    }

    const quantity = Number(req.body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Please enter a quantity greater than zero' });
    }
    if (quantity > listing.quantity) {
      return res.status(400).json({ message: `Only ${listing.quantity} ${listing.unit} available` });
    }

    // The buyer chooses where it goes; without a drop-off point there is no
    // route to drive, so this is required rather than silently defaulted.
    const deliveryLatitude = readCoordinate(req.body.deliveryLatitude, 90);
    const deliveryLongitude = readCoordinate(req.body.deliveryLongitude, 180);

    if (deliveryLatitude === null || deliveryLongitude === null) {
      return res.status(400).json({
        message: 'Please set the delivery location before placing the order',
      });
    }

    // Pricing is computed here from the stored listing, never from the client
    const unitPrice = listing.price;
    const amount = Math.round(quantity * unitPrice * 100) / 100;

    const buyer = await User.findById(req.user._id);
    if ((buyer.walletBalance || 0) < amount) {
      return res.status(402).json({
        error: 'insufficient_balance',
        balance: buyer.walletBalance || 0,
        required: amount,
        message: 'Your demo wallet balance is not enough for this order',
      });
    }

    buyer.walletBalance -= amount;
    await buyer.save();

    const order = await Order.create({
      listing: listing._id,
      buyer: buyer._id,
      seller: listing.farmer,
      cropType: listing.cropType,
      quantity,
      unit: listing.unit,
      unitPrice,
      amount,
      currency: listing.currency,
      // Pickup is the seller's listing location, frozen onto the order
      pickupLatitude: listing.latitude ?? null,
      pickupLongitude: listing.longitude ?? null,
      deliveryAddress: buildAddress(req.body),
      deliveryLatitude: deliveryLatitude,
      deliveryLongitude: deliveryLongitude,
      deliveryNote: String(req.body.deliveryNote || '').slice(0, 300),
      status: 'pending',
      paymentStatus: 'held',
    });

    await Notification.create({
      userId: listing.farmer,
      message: `New order: ${quantity} ${listing.unit} of ${listing.cropType}`,
      link: '/orders',
    });

    res.status(201).json(shapeOrder(await populatedOrder(order._id), req.user._id));
  } catch (err) {
    sendError(res, 500, 'Failed to place the order', err);
  }
};

// GET /api/orders
const listOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }],
    })
      .populate('buyer', 'name phone')
      .populate('seller', 'name phone')
      .populate('listing', 'latitude longitude')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const results = [];
    for (let i = 0; i < orders.length; i++) results.push(shapeOrder(orders[i], req.user._id));

    res.json(results);
  } catch (err) {
    sendError(res, 500, 'Failed to load orders', err);
  }
};

// GET /api/orders/:id
const getOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    const order = await populatedOrder(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const me = String(req.user._id);
    if (String(order.buyer?._id) !== me && String(order.seller?._id) !== me) {
      return res.status(403).json({ message: 'Not authorized for this order' });
    }

    res.json(shapeOrder(order, req.user._id));
  } catch (err) {
    sendError(res, 500, 'Failed to load the order', err);
  }
};

// Releases the held payment to the seller. Safe to call twice.
async function releasePayment(order) {
  if (order.paymentStatus === 'released') return;

  const existing = await Transaction.findOne({
    reference: order._id,
    referenceModel: 'Order',
    type: 'consultation_payment',
  }).lean();

  order.paymentStatus = 'released';
  order.paymentReleasedAt = new Date();

  if (existing) return;

  await User.findByIdAndUpdate(order.seller, { $inc: { walletBalance: order.amount } });

  await Transaction.create({
    from: order.buyer,
    to: order.seller,
    amount: order.amount,
    type: 'consultation_payment',
    reference: order._id,
    referenceModel: 'Order',
    status: 'completed',
    note: `Order: ${order.cropType}`.slice(0, 200),
  });
}

// PATCH /api/orders/:id/:action
// One guarded entry point for every lifecycle step.
const advanceOrder = async (req, res) => {
  try {
    const action = req.params.action;
    const rule = TRANSITIONS[action];
    if (!rule) return res.status(400).json({ message: 'Unknown order action' });

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const me = String(req.user._id);
    const isBuyer = String(order.buyer) === me;
    const isSeller = String(order.seller) === me;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: 'Not authorized for this order' });
    }

    // Only the right role may perform the step
    if (rule.actor === 'seller' && !isSeller) {
      return res.status(403).json({ message: 'Only the seller can do this' });
    }
    if (rule.actor === 'buyer' && !isBuyer) {
      return res.status(403).json({ message: 'Only the buyer can do this' });
    }

    // Repeating the step that already happened is treated as success so a
    // double click or retry cannot corrupt the record.
    if (order.status === rule.to) {
      return res.json(shapeOrder(await populatedOrder(order._id), req.user._id));
    }

    if (order.status !== rule.from) {
      return res.status(409).json({
        message: `This order is "${order.status}" and cannot move to "${rule.to}" yet`,
        status: order.status,
      });
    }

    const now = new Date();
    order.status = rule.to;

    if (action === 'confirm') order.confirmedAt = now;
    if (action === 'ready') order.readyAt = now;
    if (action === 'start') order.deliveryStartedAt = now;
    if (action === 'deliver') order.deliveredAt = now;

    if (action === 'receive') {
      // Receipt confirmation is what releases the money
      order.receiptConfirmedAt = now;
      await releasePayment(order);
      order.completedAt = now;
    }

    await order.save();

    const notifyUser = rule.actor === 'seller' ? order.buyer : order.seller;
    const messages = {
      confirm: `Your order for ${order.cropType} was confirmed by the seller`,
      ready: `Your order for ${order.cropType} is ready for delivery`,
      start: `Your order for ${order.cropType} is on the way`,
      deliver: `Your order for ${order.cropType} was delivered — please confirm receipt`,
      receive: `Delivery confirmed — ${order.amount} ${order.currency} released to your wallet`,
    };

    await Notification.create({ userId: notifyUser, message: messages[action], link: '/orders' });

    res.json(shapeOrder(await populatedOrder(order._id), req.user._id));
  } catch (err) {
    sendError(res, 500, 'Failed to update the order', err);
  }
};

// GET /api/orders/:id/receipt
// Payslip built from the stored order, never from client-sent figures.
const getReceipt = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid order id' });
    }

    const order = await populatedOrder(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const me = String(req.user._id);
    if (String(order.buyer?._id) !== me && String(order.seller?._id) !== me) {
      return res.status(403).json({ message: 'Not authorized for this order' });
    }

    if (order.paymentStatus !== 'released') {
      return res.status(409).json({ message: 'The receipt is available once payment is released' });
    }

    const transaction = await Transaction.findOne({
      reference: order._id,
      referenceModel: 'Order',
    }).lean();

    res.json({
      receiptNo: `AS-${String(order._id).slice(-8).toUpperCase()}`,
      transactionId: transaction ? String(transaction._id) : null,
      orderId: String(order._id),
      issuedAt: order.paymentReleasedAt || order.completedAt,
      placedAt: order.createdAt,
      buyerName: order.buyer?.name || '',
      sellerName: order.seller?.name || '',
      item: order.cropType,
      quantity: order.quantity,
      unit: order.unit,
      unitPrice: order.unitPrice,
      subtotal: order.amount,
      deliveryFee: 0,
      total: order.amount,
      currency: order.currency,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      deliveryAddress: order.deliveryAddress || {},
      courierName: order.courierName,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to build the receipt', err);
  }
};

module.exports = { createOrder, listOrders, getOrder, advanceOrder, getReceipt };
