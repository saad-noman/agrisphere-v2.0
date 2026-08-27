const Expense = require('../models/Expense');
const Crop = require('../models/Crop');
const ProductionRecord = require('../models/ProductionRecord');
const sendError = require('../utils/sendError');

// POST /api/expenses
// To create a new farming expense
const createExpense = async (req, res) => {
  try {
    const { cropId, category, amount, date } = req.body;

    if (!category || amount === undefined) {
      return res.status(400).json({
        message: 'Category and amount are required',
      });
    }

    if (amount < 0) {
      return res.status(400).json({
        message: 'Amount cannot be negative',
      });
    }

    if (cropId) {
      const crop = await Crop.findById(cropId);

      if (!crop) {
        return res.status(404).json({
          message: 'Crop not found',
        });
      }

      if (
        req.user.role === 'farmer' &&
        crop.farmer.toString() !== req.user.id
      ) {
        return res.status(403).json({
          message: 'Not authorized to add expense to this crop',
        });
      }
    }

    const expense = await Expense.create({
      farmer: req.user.id,
      crop: cropId || null,
      category,
      amount,
      date: date || new Date(),
    });

    res.status(201).json(expense);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/expenses
// To get the logged-in farmer's expenses
const getMyExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({
      farmer: req.user.id,
    })
      .populate('crop', 'name cropType variety')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/expenses/:id
// To get a single expense by id
const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('crop', 'name cropType variety');

    if (!expense) {
      return res.status(404).json({
        message: 'Expense not found',
      });
    }

    if (
      req.user.role === 'farmer' &&
      expense.farmer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    res.json(expense);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// PUT /api/expenses/:id
// To update an existing expense
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: 'Expense not found',
      });
    }

    if (
      req.user.role === 'farmer' &&
      expense.farmer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    const { cropId, category, amount, date } = req.body;

    if (cropId !== undefined) {
      const crop = await Crop.findById(cropId);

      if (!crop) {
        return res.status(404).json({
          message: 'Crop not found',
        });
      }

      if (
        req.user.role === 'farmer' &&
        crop.farmer.toString() !== req.user.id
      ) {
        return res.status(403).json({
          message: 'Not authorized for this crop',
        });
      }

      expense.crop = cropId;
    }

    if (category !== undefined) {
      expense.category = category;
    }

    if (amount !== undefined) {
      if (amount < 0) {
        return res.status(400).json({
          message: 'Amount cannot be negative',
        });
      }

      expense.amount = amount;
    }

    if (date !== undefined) {
      expense.date = date;
    }

    await expense.save();

    res.json(expense);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// DELETE /api/expenses/:id
// To delete an expense
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: 'Expense not found',
      });
    }

    if (
      req.user.role === 'farmer' &&
      expense.farmer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    await expense.deleteOne();

    res.json({
      message: 'Expense deleted successfully',
    });
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/expenses/analysis/:cropId
// To get a crop's cost breakdown and financial summary
const getCropFinancialAnalysis = async (req, res) => {
  try {
    const { cropId } = req.params;

    const crop = await Crop.findById(cropId);

    if (!crop) {
      return res.status(404).json({
        message: 'Crop not found',
      });
    }

    if (
      req.user.role === 'farmer' &&
      crop.farmer.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    const productionRecords = await ProductionRecord.find({
      crop: crop._id,
    });

    const totalProduction = productionRecords.reduce(
      (total, record) => total + Number(record.quantity || 0),
      0
    );

    const expenses = await Expense.find({
      farmer: crop.farmer,
      crop: crop._id,
    }).sort({
      date: -1,
    });

    const totalCost = expenses.reduce(
      (total, expense) => total + Number(expense.amount || 0),
      0
    );

    const byCategory = {};

    expenses.forEach((expense) => {
      const category = expense.category || 'Other';

      if (!byCategory[category]) {
        byCategory[category] = 0;
      }

      byCategory[category] += Number(expense.amount || 0);
    });

    res.json({
      crop: {
        id: crop._id,
        name: crop.name,
        cropType: crop.cropType,
        variety: crop.variety,
        season: crop.season,
        area: crop.area,
        areaUnit: crop.areaUnit,
        status: crop.status,
      },

      production: {
        totalQuantity: totalProduction,
        unit: productionRecords[0]?.unit || 'kg',
        recordCount: productionRecords.length,
      },

      costs: {
        total: totalCost,
        currency: 'USD',
        byCategory,
        expenseCount: expenses.length,
      },

      financial: {
        revenue: null,
        totalCost,
        profit: null,
        profitMargin: null,
        currency: 'USD',
      },

      note:
        'Revenue and profit require a supported external market-price symbol for this crop.',
    });
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

module.exports = {
  createExpense,
  getMyExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getCropFinancialAnalysis,
};
