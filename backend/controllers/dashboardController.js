const sendError = require('../utils/sendError');
const Crop = require('../models/Crop');
const ProductionRecord = require('../models/ProductionRecord');
const FertilizerRecord = require('../models/FertilizerRecord');
const PesticideRecord = require('../models/PesticideRecord');
const Expense = require('../models/Expense');
const DiseaseCase = require('../models/DiseaseCase');
const Recommendation = require('../models/Recommendation');
const ConsultationRequest = require('../models/ConsultationRequest');
const ConsultationRecord = require('../models/ConsultationRecord');

// GET /api/dashboard
// To get the farmer's dashboard summary (crop health, farming analytics, recommendations, consultations)
const getDashboard = async (req, res) => {
  try {
    const farmerId = req.user.id || req.user._id;

    const crops = await Crop.find({
      farmer: farmerId,
    }).sort({
      plantingDate: -1,
    });

    const cropIds = crops.map((crop) => crop._id);

    const [
      diseaseCases,
      productionRecords,
      fertilizerRecords,
      pesticideRecords,
      expenseRecords,
      recommendations,
      consultationRequests,
      consultationRecords,
    ] = await Promise.all([
      DiseaseCase.find({
        farmer: farmerId,
      })
        .populate('symptoms', 'name type')
        .populate('farmingConditions', 'name type')
        .sort({ updatedAt: -1 }),

      ProductionRecord.find({
        crop: { $in: cropIds },
      }).sort({
        harvestDate: -1,
      }),

      FertilizerRecord.find({
        crop: { $in: cropIds },
      })
        .populate('fertilizer', 'name category')
        .sort({
          applicationDate: -1,
        }),

      PesticideRecord.find({
        crop: { $in: cropIds },
      })
        .populate('pesticide', 'name category')
        .sort({
          applicationDate: -1,
        }),

      Expense.find({
        farmer: farmerId,
      }).sort({
        date: -1,
      }),

      Recommendation.find()
        .sort({
          createdAt: -1,
        })
        .limit(10),

      ConsultationRequest.find({
        farmerId: farmerId,
      }).sort({
        updatedAt: -1,
      }),

      ConsultationRecord.find({
        farmerId: farmerId,
      }).sort({
        completedAt: -1,
      }),
    ]);

    const diseaseStatus = {
      total: diseaseCases.length,

      pending: diseaseCases.filter(
        (item) => item.status === 'pending'
      ).length,

      underReview: diseaseCases.filter(
        (item) => item.status === 'under_review'
      ).length,

      diagnosed: diseaseCases.filter(
        (item) => item.status === 'diagnosed'
      ).length,

      active: diseaseCases.filter(
        (item) =>
          item.status === 'pending' ||
          item.status === 'under_review'
      ).length,
    };

    const recentDiagnosisUpdates = diseaseCases
      .slice(0, 10)
      .map((diseaseCase) => ({
        id: diseaseCase._id,

        crop: {
          type: diseaseCase.crop?.type || null,
          variety: diseaseCase.crop?.variety || null,
          growthStage: diseaseCase.crop?.growthStage || null,
          age: diseaseCase.crop?.age || null,
        },

        symptoms: (diseaseCase.symptoms || []).map(
          (symptom) => ({
            id: symptom._id,
            name: symptom.name,
            type: symptom.type,
          })
        ),

        farmingConditions: (
          diseaseCase.farmingConditions || []
        ).map((condition) => ({
          id: condition._id,
          name: condition.name,
          type: condition.type,
        })),

        status: diseaseCase.status,

        description: diseaseCase.description || null,

        createdAt: diseaseCase.createdAt,
        updatedAt: diseaseCase.updatedAt,
      }));

    const cropAnalytics = crops.map((crop) => {
      const cropId = crop._id.toString();

      const cropProduction = productionRecords.filter(
        (record) =>
          record.crop.toString() === cropId
      );

      const cropFertilizers = fertilizerRecords.filter(
        (record) =>
          record.crop.toString() === cropId
      );

      const cropPesticides = pesticideRecords.filter(
        (record) =>
          record.crop.toString() === cropId
      );

      const cropExpenses = expenseRecords.filter(
        (expense) =>
          expense.crop &&
          expense.crop.toString() === cropId
      );

      const totalProduction = cropProduction.reduce(
        (sum, record) =>
          sum + Number(record.quantity || 0),
        0
      );

      const totalFertilizer = cropFertilizers.reduce(
        (sum, record) =>
          sum + Number(record.amount || 0),
        0
      );

      const totalPesticide = cropPesticides.reduce(
        (sum, record) =>
          sum + Number(record.amount || 0),
        0
      );

      const totalExpenses = cropExpenses.reduce(
        (sum, expense) =>
          sum + Number(expense.amount || 0),
        0
      );

      let expectedCycleDays = null;

      if (
        crop.plantingDate &&
        crop.expectedHarvestDate
      ) {
        const start =
          new Date(crop.plantingDate);

        const end =
          new Date(crop.expectedHarvestDate);

        expectedCycleDays = Math.max(
          0,
          Math.ceil(
            (end - start) /
              (1000 * 60 * 60 * 24)
          )
        );
      }

      const actualHarvestDates =
        cropProduction
          .filter((record) => record.harvestDate)
          .map(
            (record) =>
              new Date(record.harvestDate)
          )
          .sort((a, b) => a - b);

      let actualCycleDays = null;

      if (
        crop.plantingDate &&
        actualHarvestDates.length > 0
      ) {
        const plantingDate =
          new Date(crop.plantingDate);

        const firstHarvest =
          actualHarvestDates[0];

        actualCycleDays = Math.max(
          0,
          Math.ceil(
            (firstHarvest - plantingDate) /
              (1000 * 60 * 60 * 24)
          )
        );
      }

      let yieldPerAcre = null;

      if (
        crop.area &&
        crop.area > 0
      ) {
        yieldPerAcre =
          totalProduction / crop.area;
      }

      const lastHarvestDate =
        actualHarvestDates.length > 0
          ? actualHarvestDates[
              actualHarvestDates.length - 1
            ]
          : null;

      return {
        crop: {
          id: crop._id,
          name: crop.name,
          cropType: crop.cropType,
          variety: crop.variety || null,
          area: crop.area || null,
          areaUnit: crop.areaUnit,
          status: crop.status,
        },

        farmingCycle: {
          plantingDate:
            crop.plantingDate || null,

          expectedHarvestDate:
            crop.expectedHarvestDate || null,

          expectedCycleDays,

          actualFirstHarvestDate:
            actualHarvestDates.length > 0
              ? actualHarvestDates[0]
              : null,

          actualLastHarvestDate:
            lastHarvestDate,

          actualCycleDays,
        },

        production: {
          totalQuantity: totalProduction,

          unit:
            cropProduction[0]?.unit || 'kg',

          recordCount:
            cropProduction.length,

          yieldPerAcre,
        },

        fertilizer: {
          totalAmount: totalFertilizer,

          unit:
            cropFertilizers[0]?.unit || 'kg',

          applicationCount:
            cropFertilizers.length,
        },

        pesticide: {
          totalAmount: totalPesticide,

          unit:
            cropPesticides[0]?.unit || 'L',

          applicationCount:
            cropPesticides.length,
        },

        expenses: {
          total: totalExpenses,

          recordCount:
            cropExpenses.length,
        },
      };
    });

    const totalProduction =
      productionRecords.reduce(
        (sum, record) =>
          sum + Number(record.quantity || 0),
        0
      );

    const totalFertilizer =
      fertilizerRecords.reduce(
        (sum, record) =>
          sum + Number(record.amount || 0),
        0
      );

    const totalPesticide =
      pesticideRecords.reduce(
        (sum, record) =>
          sum + Number(record.amount || 0),
        0
      );

    const totalExpenses =
      expenseRecords.reduce(
        (sum, expense) =>
          sum + Number(expense.amount || 0),
        0
      );

    const recommendationSummary = {
      total: recommendations.length,

      recent: recommendations
        .slice(0, 5)
        .map((recommendation) => ({
          id: recommendation._id,
          cropType: recommendation.cropType || null,
          title: recommendation.title || null,
          description:
            recommendation.description || null,
          createdAt: recommendation.createdAt,
          updatedAt: recommendation.updatedAt,
        })),
    };

    const consultationSummary = {
      total: consultationRequests.length,

      pending: consultationRequests.filter(
        (item) => item.status === 'pending'
      ).length,

      approved: consultationRequests.filter(
        (item) => item.status === 'approved'
      ).length,

      rejected: consultationRequests.filter(
        (item) => item.status === 'rejected'
      ).length,

      rescheduled: consultationRequests.filter(
        (item) => item.status === 'rescheduled'
      ).length,

      completed: consultationRequests.filter(
        (item) => item.status === 'completed'
      ).length,

      records: consultationRecords.length,

      recent: consultationRequests
        .slice(0, 5)
        .map((request) => ({
          id: request._id,

          title:
            request.title || null,

          cropType:
            request.cropType || null,

          subject:
            request.subject || null,

          consultationType:
            request.consultationType || null,

          preferredDate:
            request.preferredDate || null,

          status:
            request.status,

          createdAt:
            request.createdAt,

          updatedAt:
            request.updatedAt,
        })),
    };

    res.json({
      farmer: farmerId,

      cropHealth: {
        cropCount: crops.length,

        activeCrops: crops.filter(
          (crop) =>
            crop.status === 'active'
        ).length,

        harvestedCrops: crops.filter(
          (crop) =>
            crop.status === 'harvested'
        ).length,

        abandonedCrops: crops.filter(
          (crop) =>
            crop.status === 'abandoned'
        ).length,

        diseaseCases: diseaseStatus,

        recentDiagnosisUpdates,
      },

      farmingAnalytics: {
        totals: {
          production: totalProduction,

          productionUnit:
            productionRecords[0]?.unit ||
            'kg',

          fertilizer: totalFertilizer,

          fertilizerUnit:
            fertilizerRecords[0]?.unit ||
            'kg',

          pesticide: totalPesticide,

          pesticideUnit:
            pesticideRecords[0]?.unit ||
            'L',

          expenses: totalExpenses,
        },

        crops: cropAnalytics,
      },

      recommendationSummary,

      consultationSummary,

      generatedAt: new Date(),
    });

  } catch (err) {
    sendError(res, 500, 'Failed to load dashboard', err);
  }
};

module.exports = {
  getDashboard,
};
