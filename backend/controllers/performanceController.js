const mongoose = require('mongoose');
const sendError = require('../utils/sendError');

const Crop = require('../models/Crop');
const ProductionRecord = require('../models/ProductionRecord');
const FertilizerRecord = require('../models/FertilizerRecord');
const PesticideRecord = require('../models/PesticideRecord');
const Expense = require('../models/Expense');

// GET /api/crops/:cropId/performance
// To get one crop's production, input and cost performance
const getCropPerformance = async (req, res) => {
  try {
    const { cropId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cropId)) {
      return res.status(400).json({
        message: 'Invalid crop ID',
      });
    }

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

    const [
      productionRecords,
      fertilizerRecords,
      pesticideRecords,
      expenseRecords,
    ] = await Promise.all([
      ProductionRecord.find({ crop: crop._id }).sort({ harvestDate: 1 }),

      FertilizerRecord.find({ crop: crop._id }).sort({
        applicationDate: 1,
      }),

      PesticideRecord.find({ crop: crop._id }).sort({
        applicationDate: 1,
      }),

      Expense.find({
        crop: crop._id,
        farmer: crop.farmer,
      }).sort({ date: 1 }),
    ]);

    const totalProduction = productionRecords.reduce(
      (total, record) => total + (Number(record.quantity) || 0),
      0
    );

    const productionUnit =
      productionRecords.length > 0
        ? productionRecords[0].unit || 'kg'
        : 'kg';

    const area = Number(crop.area) || 0;

    const yieldPerAcre =
      area > 0 ? totalProduction / area : null;

    const totalFertilizer = fertilizerRecords.reduce(
      (total, record) => total + (Number(record.amount) || 0),
      0
    );

    const fertilizerUnit =
      fertilizerRecords.length > 0
        ? fertilizerRecords[0].unit || 'kg'
        : 'kg';

    const fertilizerApplicationCount =
      fertilizerRecords.length;

    const totalPesticide = pesticideRecords.reduce(
      (total, record) => total + (Number(record.amount) || 0),
      0
    );

    const pesticideUnit =
      pesticideRecords.length > 0
        ? pesticideRecords[0].unit || 'L'
        : 'L';

    const pesticideApplicationCount =
      pesticideRecords.length;

    const totalExpenses = expenseRecords.reduce(
      (total, expense) => total + (Number(expense.amount) || 0),
      0
    );

    const expensesByCategory = {};

    expenseRecords.forEach((expense) => {
      const category = expense.category || 'Other';

      expensesByCategory[category] =
        (expensesByCategory[category] || 0) +
        (Number(expense.amount) || 0);
    });

    const plantingDate = crop.plantingDate || null;

    let harvestDate = null;

    if (productionRecords.length > 0) {
      harvestDate =
        productionRecords[productionRecords.length - 1].harvestDate;
    }

    let cycleDays = null;

    if (plantingDate && harvestDate) {
      const difference =
        new Date(harvestDate).getTime() -
        new Date(plantingDate).getTime();

      cycleDays = Math.max(
        0,
        Math.ceil(difference / (1000 * 60 * 60 * 24))
      );
    }

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

      farmingCycle: {
        plantingDate,
        harvestDate,
        cycleDays,
      },

      production: {
        totalQuantity: totalProduction,
        unit: productionUnit,
        recordCount: productionRecords.length,
        yieldPerAcre,
      },

      fertilizer: {
        totalAmount: totalFertilizer,
        unit: fertilizerUnit,
        applicationCount: fertilizerApplicationCount,
      },

      pesticide: {
        totalAmount: totalPesticide,
        unit: pesticideUnit,
        applicationCount: pesticideApplicationCount,
      },

      expenses: {
        total: totalExpenses,
        recordCount: expenseRecords.length,
        byCategory: expensesByCategory,
      },
    });
  } catch (err) {
    console.error('Crop performance error:', err);

    sendError(res, 500, 'Failed to calculate crop performance', err);
  }
};

// GET /api/farms/performance
// To get performance across all of the farmer's crops
const getFarmPerformance = async (req, res) => {
  try {
    const cropQuery =
      req.user.role === 'farmer'
        ? { farmer: req.user.id }
        : {};

    const crops = await Crop.find(cropQuery)
      .sort({ plantingDate: -1 });

    const performance = await Promise.all(
      crops.map(async (crop) => {
        const [
          productionRecords,
          fertilizerRecords,
          pesticideRecords,
          expenseRecords,
        ] = await Promise.all([
          ProductionRecord.find({
            crop: crop._id,
          }),

          FertilizerRecord.find({
            crop: crop._id,
          }),

          PesticideRecord.find({
            crop: crop._id,
          }),

          Expense.find({
            crop: crop._id,
            farmer: crop.farmer,
          }),
        ]);

        const totalProduction = productionRecords.reduce(
          (sum, record) => sum + (Number(record.quantity) || 0),
          0
        );

        const area = Number(crop.area) || 0;

        const yieldPerAcre =
          area > 0
            ? totalProduction / area
            : null;

        const totalFertilizer = fertilizerRecords.reduce(
          (sum, record) => sum + (Number(record.amount) || 0),
          0
        );

        const totalPesticide = pesticideRecords.reduce(
          (sum, record) => sum + (Number(record.amount) || 0),
          0
        );

        const totalExpenses = expenseRecords.reduce(
          (sum, expense) =>
            sum + (Number(expense.amount) || 0),
          0
        );

        let harvestDate = null;

        if (productionRecords.length > 0) {
          const harvestDates = productionRecords
            .filter((record) => record.harvestDate)
            .map((record) => new Date(record.harvestDate));

          if (harvestDates.length > 0) {
            harvestDate = new Date(
              Math.max(...harvestDates.map((date) => date.getTime()))
            );
          }
        }

        let cycleDays = null;

        if (crop.plantingDate && harvestDate) {
          const difference =
            new Date(harvestDate).getTime() -
            new Date(crop.plantingDate).getTime();

          cycleDays = Math.max(
            0,
            Math.ceil(
              difference / (1000 * 60 * 60 * 24)
            )
          );
        }

        return {
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

          farmingCycle: {
            plantingDate: crop.plantingDate || null,
            harvestDate,
            cycleDays,
          },

          production: {
            totalQuantity: totalProduction,
            unit:
              productionRecords[0]?.unit || 'kg',
            recordCount: productionRecords.length,
            yieldPerAcre,
          },

          fertilizer: {
            totalAmount: totalFertilizer,
            unit:
              fertilizerRecords[0]?.unit || 'kg',
            applicationCount:
              fertilizerRecords.length,
          },

          pesticide: {
            totalAmount: totalPesticide,
            unit:
              pesticideRecords[0]?.unit || 'L',
            applicationCount:
              pesticideRecords.length,
          },

          expenses: {
            total: totalExpenses,
            recordCount: expenseRecords.length,
          },
        };
      })
    );

    const totals = performance.reduce(
      (result, item) => {
        result.production +=
          item.production.totalQuantity;

        result.fertilizer +=
          item.fertilizer.totalAmount;

        result.pesticide +=
          item.pesticide.totalAmount;

        result.expenses +=
          item.expenses.total;

        return result;
      },
      {
        production: 0,
        fertilizer: 0,
        pesticide: 0,
        expenses: 0,
      }
    );

    res.json({
      farmer: req.user.id,

      cropCount: performance.length,

      totals,

      crops: performance,
    });
  } catch (err) {
    console.error('Farm performance error:', err);

    sendError(res, 500, 'Failed to calculate farm performance', err);
  }
};

module.exports = {
  getCropPerformance,
  getFarmPerformance,
};
