const Disease = require('../models/Disease');
const DiseaseCase = require('../models/DiseaseCase');
const ConsultationRequest = require('../models/ConsultationRequest');
const Appointment = require('../models/Appointment');
const ConsultationRecord = require('../models/ConsultationRecord');
const Recommendation = require('../models/Recommendation');
const Crop = require('../models/Crop');
const FertilizerRecord = require('../models/FertilizerRecord');
const PesticideRecord = require('../models/PesticideRecord');
const ProductionRecord = require('../models/ProductionRecord');

// GET /api/activity-timeline
// To get the farmer's activity timeline (disease, consultation, recommendation and farming events)
const getActivityTimeline = async (req, res) => {
  try {
    const farmerId = req.user._id;

    const {
      type = 'all',
      from,
      to,
    } = req.query;

    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;

    page = Math.max(page, 1);
    limit = Math.min(Math.max(limit, 1), 100);

    const allowedTypes = [
      'all',
      'disease',
      'consultation',
      'recommendation',
      'farming',
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Allowed values: ${allowedTypes.join(', ')}`,
      });
    }

    let startDate;
    let endDate;

    if (from) {
      startDate = new Date(from);

      if (Number.isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid "from" date',
        });
      }
    }

    if (to) {
      endDate = new Date(to);

      if (Number.isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid "to" date',
        });
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        endDate.setHours(23, 59, 59, 999);
      }
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: '"from" date cannot be after "to" date',
      });
    }

    const inDateRange = (date) => {
      if (!date) {
        return false;
      }

      const eventDate = new Date(date);

      if (Number.isNaN(eventDate.getTime())) {
        return false;
      }

      if (startDate && eventDate < startDate) {
        return false;
      }

      if (endDate && eventDate > endDate) {
        return false;
      }

      return true;
    };

    const includeType = (eventType) => {
      if (type === 'all') {
        return true;
      }

      return eventType === type;
    };

    const timeline = [];

    if (includeType('disease')) {
      const diseaseCases = await DiseaseCase.find({
        farmer: farmerId,
      })
        .populate('symptoms', 'name type')
        .populate('farmingConditions', 'name type')
        .sort({ createdAt: -1 });

      const diseases = await Disease.find()
        .populate('symptoms', 'name')
        .lean();

      for (const diseaseCase of diseaseCases) {
        if (inDateRange(diseaseCase.createdAt)) {
          timeline.push({
            id: diseaseCase._id.toString(),

            type: 'disease',

            subtype: 'case_submitted',

            date: diseaseCase.createdAt,

            title: 'Disease case submitted',

            description:
              diseaseCase.description ||
              `A disease case was submitted for ${diseaseCase.crop?.type || 'crop'}.`,

            status: diseaseCase.status,

            crop: {
              type: diseaseCase.crop?.type || null,
              variety: diseaseCase.crop?.variety || null,
              growthStage: diseaseCase.crop?.growthStage || null,
              age: diseaseCase.crop?.age || null,
            },

            data: {
              symptoms: diseaseCase.symptoms.map((symptom) => ({
                id: symptom._id,
                name: symptom.name,
                type: symptom.type,
              })),

              farmingConditions: diseaseCase.farmingConditions.map(
                (condition) => ({
                  id: condition._id,
                  name: condition.name,
                  type: condition.type,
                })
              ),

              images: diseaseCase.images || [],
            },

            source: {
              model: 'DiseaseCase',
              id: diseaseCase._id,
            },
          });
        }

        const reportedSymptoms = new Set(
          diseaseCase.symptoms.map((symptom) =>
            symptom._id.toString()
          )
        );

        const matches = diseases
          .map((disease) => {
            const matchedSymptoms = disease.symptoms.filter(
              (symptom) =>
                reportedSymptoms.has(symptom._id.toString())
            );

            const unmatchedSymptoms = disease.symptoms.filter(
              (symptom) =>
                !reportedSymptoms.has(symptom._id.toString())
            );

            const totalDiseaseSymptoms = disease.symptoms.length;

            const matchedSymptomsCount =
              matchedSymptoms.length;

            const matchPercentage =
              totalDiseaseSymptoms > 0
                ? Math.round(
                    (matchedSymptomsCount /
                      totalDiseaseSymptoms) *
                      100
                  )
                : 0;

            return {
              disease,
              matchedSymptoms,
              unmatchedSymptoms,
              totalDiseaseSymptoms,
              matchedSymptomsCount,
              matchPercentage,
            };
          })
          .filter(
            (match) => match.matchedSymptomsCount > 0
          )
          .sort((a, b) => {
            if (
              b.matchPercentage !==
              a.matchPercentage
            ) {
              return (
                b.matchPercentage -
                a.matchPercentage
              );
            }

            return (
              b.matchedSymptomsCount -
              a.matchedSymptomsCount
            );
          });

        const bestMatch = matches[0];

        if (
          bestMatch &&
          inDateRange(diseaseCase.updatedAt || diseaseCase.createdAt)
        ) {
          timeline.push({
            id: `${diseaseCase._id.toString()}-match`,

            type: 'disease',

            subtype: 'possible_match',

            date:
              diseaseCase.updatedAt ||
              diseaseCase.createdAt,

            title: `Possible disease match: ${bestMatch.disease.name}`,

            description: `${bestMatch.disease.name} matches ${bestMatch.matchPercentage}% of the reported symptoms.`,

            status: diseaseCase.status,

            crop: {
              type: diseaseCase.crop?.type || null,
              variety: diseaseCase.crop?.variety || null,
              growthStage:
                diseaseCase.crop?.growthStage || null,
            },

            data: {
              diseaseId: bestMatch.disease._id,

              diseaseName: bestMatch.disease.name,

              matchPercentage:
                bestMatch.matchPercentage,

              matchedSymptomsCount:
                bestMatch.matchedSymptomsCount,

              totalDiseaseSymptoms:
                bestMatch.totalDiseaseSymptoms,

              matchedSymptoms:
                bestMatch.matchedSymptoms.map(
                  (symptom) => ({
                    id: symptom._id,
                    name: symptom.name,
                  })
                ),

              unmatchedSymptoms:
                bestMatch.unmatchedSymptoms.map(
                  (symptom) => ({
                    id: symptom._id,
                    name: symptom.name,
                  })
                ),

              confidence: 'possible',
            },

            source: {
              model: 'DiseaseCase',
              id: diseaseCase._id,
            },
          });
        }
      }
    }

    if (includeType('consultation')) {
      const requests =
        await ConsultationRequest.find({
          farmerId,
        })
          .populate(
            'expertId',
            'fullName specialization phone email'
          )
          .sort({ createdAt: -1 });

      const requestIds = requests.map(
        (request) => request._id
      );

      const appointments =
        await Appointment.find({
          farmerId,
          consultationRequestId: {
            $in: requestIds,
          },
        })
          .populate(
            'expertId',
            'fullName specialization phone email'
          )
          .sort({ date: -1 });

      const appointmentIds = appointments.map(
        (appointment) => appointment._id
      );

      const records =
        await ConsultationRecord.find({
          farmerId,
          appointmentId: {
            $in: appointmentIds,
          },
        });

      for (const request of requests) {
        if (!inDateRange(request.createdAt)) {
          continue;
        }

        timeline.push({
          id: request._id.toString(),

          type: 'consultation',

          subtype: 'request',

          date: request.createdAt,

          title:
            request.title ||
            'Consultation requested',

          description:
            request.description ||
            request.subject ||
            'A consultation request was submitted.',

          status: request.status,

          crop: {
            type: request.cropType || null,
          },

          expert: request.expertId
            ? {
                id: request.expertId._id,
                name:
                  request.expertId.fullName ||
                  null,
                specialization:
                  request.expertId.specialization ||
                  null,
              }
            : null,

          data: {
            subject: request.subject || null,

            consultationType:
              request.consultationType || null,

            preferredDate:
              request.preferredDate || null,
          },

          source: {
            model: 'ConsultationRequest',
            id: request._id,
          },
        });
      }

      for (const appointment of appointments) {
        const appointmentDate =
          appointment.date ||
          appointment.createdAt;

        if (!inDateRange(appointmentDate)) {
          continue;
        }

        timeline.push({
          id: appointment._id.toString(),

          type: 'consultation',

          subtype: 'appointment',

          date: appointmentDate,

          title:
            appointment.title ||
            'Consultation scheduled',

          description:
            appointment.status === 'completed'
              ? 'Consultation appointment completed.'
              : 'Consultation appointment scheduled.',

          status: appointment.status,

          expert: appointment.expertId
            ? {
                id: appointment.expertId._id,
                name:
                  appointment.expertId.fullName ||
                  null,
                specialization:
                  appointment.expertId.specialization ||
                  null,
              }
            : null,

          data: {
            consultationType:
              appointment.consultationType || null,

            time: appointment.time || null,

            location:
              appointment.location || null,

            meetingLink:
              appointment.meetingLink || null,
          },

          source: {
            model: 'Appointment',
            id: appointment._id,
          },
        });
      }

      for (const record of records) {
        const recordDate =
          record.completedAt ||
          record.createdAt;

        if (!inDateRange(recordDate)) {
          continue;
        }

        timeline.push({
          id: record._id.toString(),

          type: 'consultation',

          subtype: 'completed',

          date: recordDate,

          title: 'Consultation completed',

          description:
            record.diagnosis ||
            record.notes ||
            'Consultation completed by agricultural expert.',

          status: 'completed',

          data: {
            diagnosis:
              record.diagnosis || null,

            recommendations:
              record.recommendations || null,

            notes:
              record.notes || null,
          },

          source: {
            model: 'ConsultationRecord',
            id: record._id,
          },
        });
      }
    }

    if (includeType('recommendation')) {
      const recommendations =
        await Recommendation.find({
          farmerId,
        })
          .populate(
            'crop',
            'name cropType variety season'
          )
          .sort({ createdAt: -1 });

      for (const recommendation of recommendations) {
        if (!inDateRange(recommendation.createdAt)) {
          continue;
        }

        timeline.push({
          id: recommendation._id.toString(),

          type: 'recommendation',

          subtype: 'recommendation',

          date: recommendation.createdAt,

          title:
            recommendation.title ||
            'Farming recommendation',

          description:
            recommendation.description ||
            'A farming recommendation was added.',

          status: recommendation.status,

          crop: recommendation.crop
            ? {
                id: recommendation.crop._id,
                name: recommendation.crop.name,
                type: recommendation.crop.cropType,
                variety:
                  recommendation.crop.variety ||
                  null,
                season:
                  recommendation.crop.season ||
                  null,
              }
            : {
                type:
                  recommendation.cropType ||
                  null,
              },

          data: {
            cropType:
              recommendation.cropType ||
              null,
          },

          source: {
            model: 'Recommendation',
            id: recommendation._id,
          },
        });
      }
    }

    if (includeType('farming')) {
      const crops = await Crop.find({
        farmer: farmerId,
      }).sort({ createdAt: -1 });

      for (const crop of crops) {
        if (inDateRange(crop.createdAt)) {
          timeline.push({
            id: `${crop._id.toString()}-created`,

            type: 'farming',

            subtype: 'crop_created',

            date: crop.createdAt,

            title: `Crop added: ${crop.name}`,

            description: `${crop.cropType}${crop.variety ? ` (${crop.variety})` : ''} was added to the farm.`,

            status: crop.status,

            crop: {
              id: crop._id,
              name: crop.name,
              type: crop.cropType,
              variety: crop.variety || null,
              season: crop.season || null,
              area: crop.area || null,
              areaUnit: crop.areaUnit || null,
            },

            data: {
              plantingDate:
                crop.plantingDate || null,

              expectedHarvestDate:
                crop.expectedHarvestDate ||
                null,

              location:
                crop.location || null,
            },

            source: {
              model: 'Crop',
              id: crop._id,
            },
          });
        }

        if (
          crop.plantingDate &&
          inDateRange(crop.plantingDate)
        ) {
          timeline.push({
            id: `${crop._id.toString()}-planted`,

            type: 'farming',

            subtype: 'planting',

            date: crop.plantingDate,

            title: `${crop.name} planted`,

            description: `${crop.cropType} was planted on the farm.`,

            status: crop.status,

            crop: {
              id: crop._id,
              name: crop.name,
              type: crop.cropType,
              variety: crop.variety || null,
              season: crop.season || null,
            },

            source: {
              model: 'Crop',
              id: crop._id,
            },
          });
        }
      }

      const fertilizerRecords =
        await FertilizerRecord.find({
          crop: {
            $in: crops.map((crop) => crop._id),
          },
        })
          .populate(
            'crop',
            'name cropType variety farmer'
          )
          .populate(
            'fertilizer',
            'name category description'
          )
          .sort({ applicationDate: -1 });

      for (const record of fertilizerRecords) {
        if (!inDateRange(record.applicationDate)) {
          continue;
        }

        timeline.push({
          id: record._id.toString(),

          type: 'farming',

          subtype: 'fertilizer_application',

          date: record.applicationDate,

          title:
            `Fertilizer applied: ${
              record.fertilizer?.name ||
              'Unknown fertilizer'
            }`,

          description:
            `${record.amount} ${record.unit || 'kg'} of ${
              record.fertilizer?.name ||
              'fertilizer'
            } was applied to ${
              record.crop?.name ||
              record.crop?.cropType ||
              'the crop'
            }.`,

          status: 'completed',

          crop: record.crop
            ? {
                id: record.crop._id,
                name: record.crop.name,
                type: record.crop.cropType,
                variety:
                  record.crop.variety ||
                  null,
              }
            : null,

          data: {
            amount: record.amount,

            unit: record.unit || 'kg',

            fertilizer: record.fertilizer
              ? {
                  id: record.fertilizer._id,
                  name: record.fertilizer.name,
                  category:
                    record.fertilizer.category ||
                    null,
                }
              : null,

            notes: record.notes || null,
          },

          source: {
            model: 'FertilizerRecord',
            id: record._id,
          },
        });
      }

      const pesticideRecords =
        await PesticideRecord.find({
          crop: {
            $in: crops.map((crop) => crop._id),
          },
        })
          .populate(
            'crop',
            'name cropType variety farmer'
          )
          .populate(
            'pesticide',
            'name category description'
          )
          .sort({ applicationDate: -1 });

      for (const record of pesticideRecords) {
        if (!inDateRange(record.applicationDate)) {
          continue;
        }

        timeline.push({
          id: record._id.toString(),

          type: 'farming',

          subtype: 'pesticide_application',

          date: record.applicationDate,

          title:
            `Pesticide applied: ${
              record.pesticide?.name ||
              'Unknown pesticide'
            }`,

          description:
            `${record.amount} ${record.unit || 'L'} of ${
              record.pesticide?.name ||
              'pesticide'
            } was applied to ${
              record.crop?.name ||
              record.crop?.cropType ||
              'the crop'
            }.`,

          status: 'completed',

          crop: record.crop
            ? {
                id: record.crop._id,
                name: record.crop.name,
                type: record.crop.cropType,
                variety:
                  record.crop.variety ||
                  null,
              }
            : null,

          data: {
            amount: record.amount,

            unit: record.unit || 'L',

            targetPest:
              record.targetPest || null,

            pesticide: record.pesticide
              ? {
                  id: record.pesticide._id,
                  name: record.pesticide.name,
                  category:
                    record.pesticide.category ||
                    null,
                }
              : null,

            notes: record.notes || null,
          },

          source: {
            model: 'PesticideRecord',
            id: record._id,
          },
        });
      }

      const productionRecords =
        await ProductionRecord.find({
          crop: {
            $in: crops.map((crop) => crop._id),
          },
        })
          .populate(
            'crop',
            'name cropType variety farmer'
          )
          .sort({ harvestDate: -1 });

      for (const record of productionRecords) {
        if (!inDateRange(record.harvestDate)) {
          continue;
        }

        timeline.push({
          id: record._id.toString(),

          type: 'farming',

          subtype: 'harvest',

          date: record.harvestDate,

          title:
            `Harvest recorded: ${
              record.crop?.name ||
              record.crop?.cropType ||
              'Crop'
            }`,

          description:
            `${record.quantity} ${
              record.unit || 'kg'
            } of ${
              record.crop?.name ||
              record.crop?.cropType ||
              'crop'
            } was recorded as harvested.`,

          status: 'completed',

          crop: record.crop
            ? {
                id: record.crop._id,
                name: record.crop.name,
                type: record.crop.cropType,
                variety:
                  record.crop.variety ||
                  null,
              }
            : null,

          data: {
            quantity: record.quantity,

            unit: record.unit || 'kg',

            quality:
              record.quality || null,

            notes:
              record.notes || null,
          },

          source: {
            model: 'ProductionRecord',
            id: record._id,
          },
        });
      }
    }

    timeline.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      return dateB - dateA;
    });

    const total = timeline.length;

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / limit);

    const startIndex =
      (page - 1) * limit;

    const paginatedTimeline =
      timeline.slice(
        startIndex,
        startIndex + limit
      );

    res.json({
      success: true,

      data: paginatedTimeline,

      pagination: {
        page,
        limit,
        total,
        pages: totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1 && totalPages > 0,
      },

      filters: {
        type,
        from: from || null,
        to: to || null,
      },
    });
  } catch (err) {
    console.error('Activity timeline error:', err);
    const body = { success: false, message: 'Failed to fetch activity timeline' };
    if (process.env.NODE_ENV !== 'production') body.error = err.message;
    res.status(500).json(body);
  }
};

module.exports = {
  getActivityTimeline,
};
