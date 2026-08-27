const Disease = require('../models/Disease');
const DiseaseCase = require('../models/DiseaseCase');
const Tag = require('../models/Tag');
const Notification = require('../models/Notification');
const sendError = require('../utils/sendError');

// POST /api/diseases
// To submit a new disease case for expert diagnosis
const submitDiseaseCase = async (req, res) => {
  try {
    const {
      cropType,
      cropVariety,
      growthStage,
      cropAge,
      symptoms,
      farmingConditions,
      description,
    } = req.body;

    if (!cropType) {
      return res.status(400).json({
        message: 'Crop type is required',
      });
    }

    let symptomTags = [];
    let conditionTags = [];

    try {
      symptomTags = symptoms ? JSON.parse(symptoms) : [];
      conditionTags = farmingConditions
        ? JSON.parse(farmingConditions)
        : [];
    } catch {
      return res.status(400).json({
        message: 'Symptoms and farming conditions must be valid JSON arrays',
      });
    }

    const tags = await Tag.find({
      _id: { $in: [...symptomTags, ...conditionTags] },
    });

    const existingTagIds = tags.map((tag) => tag._id.toString());

    const invalidSymptom = symptomTags.some(
      (id) => !existingTagIds.includes(id)
    );

    const invalidCondition = conditionTags.some(
      (id) => !existingTagIds.includes(id)
    );

    if (invalidSymptom || invalidCondition) {
      return res.status(400).json({
        message: 'One or more supplied tags do not exist',
      });
    }

    const images = (req.files || []).map(
      (file) => `/uploads/disease-cases/${file.filename}`
    );

    const diseaseCase = await DiseaseCase.create({
      farmer: req.user.id,

      crop: {
        type: cropType,
        variety: cropVariety,
        growthStage,
        age: cropAge,
      },

      symptoms: symptomTags,

      farmingConditions: conditionTags,

      images,

      description,

      status: 'pending',
    });

    const populatedCase = await DiseaseCase.findById(diseaseCase._id)
      .populate('farmer', 'name email')
      .populate('symptoms', 'name type')
      .populate('farmingConditions', 'name type');

    res.status(201).json({
      message: 'Disease case submitted successfully',
      diseaseCase: populatedCase,
    });
  } catch (err) {
    console.error(err);

    sendError(res, 500, 'Failed to submit disease case', err);
  }
};


// GET /api/diseases/tags
// To search symptom/farming-condition tags
const searchTags = async (req, res) => {
  try {
    const { search = '', type } = req.query;

    const filter = {
      name: {
        $regex: search,
        $options: 'i',
      },
    };

    if (type) {
      filter.type = type;
    }

    const tags = await Tag.find(filter)
      .select('name type')
      .sort({ name: 1 })
      .limit(30);

    res.json(tags);
  } catch (err) {
    sendError(res, 500, 'Failed to search tags', err);
  }
};


// POST /api/diseases/tags
// To create a new tag
const createTag = async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        message: 'Tag name and type are required',
      });
    }

    if (!['symptom', 'farming_condition'].includes(type)) {
      return res.status(400).json({
        message: 'Invalid tag type',
      });
    }

    const normalizedName = name.trim().toLowerCase();

    const existingTag = await Tag.findOne({
      name: normalizedName,
      type,
    });

    if (existingTag) {
      return res.status(409).json({
        message: 'This tag already exists',
        tag: existingTag,
      });
    }

    const tag = await Tag.create({
      name: normalizedName,
      type,
    });

    res.status(201).json({
      message: 'Tag created successfully',
      tag,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to create tag', err);
  }
};

// GET /api/diseases/:caseId/matches
// To find diseases matching a case's reported symptoms
const getDiseaseMatches = async (req, res) => {
  try {
    const { caseId } = req.params;

    const diseaseCase = await DiseaseCase.findById(caseId)
      .populate('symptoms', 'name');

    if (!diseaseCase) {
      return res.status(404).json({
        message: 'Disease case not found',
      });
    }

    const diseases = await Disease.find()
      .populate('symptoms', 'name');

    const reportedSymptoms = new Set(
      diseaseCase.symptoms.map((symptom) => symptom._id.toString())
    );

    const matches = diseases.map((disease) => {
      const matchedSymptoms = disease.symptoms.filter((symptom) =>
        reportedSymptoms.has(symptom._id.toString())
      );

      const unmatchedSymptoms = disease.symptoms.filter(
        (symptom) => !reportedSymptoms.has(symptom._id.toString())
      );

      const totalDiseaseSymptoms = disease.symptoms.length;
      const matchedSymptomsCount = matchedSymptoms.length;

      const matchPercentage =
        totalDiseaseSymptoms > 0
          ? Math.round(
            (matchedSymptomsCount / totalDiseaseSymptoms) * 100
          )
          : 0;

      return {
        _id: disease._id,
        name: disease.name,
        description: disease.description,

        totalDiseaseSymptoms,
        matchedSymptomsCount,

        matchedSymptoms: matchedSymptoms.map((symptom) => ({
          _id: symptom._id,
          name: symptom.name,
        })),

        unmatchedSymptoms: unmatchedSymptoms.map((symptom) => ({
          _id: symptom._id,
          name: symptom.name,
        })),

        matchPercentage,
      };
    });

    const filteredMatches = matches
      .filter((match) => match.matchedSymptomsCount > 0)
      .sort((a, b) => {
        if (b.matchPercentage !== a.matchPercentage) {
          return b.matchPercentage - a.matchPercentage;
        }

        return b.matchedSymptomsCount - a.matchedSymptomsCount;
      });

    res.json(filteredMatches);
  } catch (err) {
    console.error(err);

    sendError(res, 500, 'Failed to find disease matches', err);
  }
};

// POST /api/diseases/library
// To add a new disease to the disease library
const createDisease = async (req, res) => {
  try {
    const { name, description, symptoms } = req.body;

    if (!name || !description || !Array.isArray(symptoms)) {
      return res.status(400).json({
        message: 'Name, description and symptoms are required',
      });
    }

    const existing = await Disease.findOne({ name });

    if (existing) {
      return res.status(409).json({
        message: 'Disease already exists',
      });
    }

    const tags = await Tag.find({
      _id: { $in: symptoms },
      type: 'symptom',
    });

    if (tags.length !== symptoms.length) {
      return res.status(400).json({
        message: 'One or more symptom tags are invalid',
      });
    }

    const disease = await Disease.create({
      name,
      description,
      symptoms,
    });

    const populated = await Disease.findById(disease._id)
      .populate('symptoms', 'name');

    res.status(201).json(populated);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/diseases/library
// To list the disease library
const getDiseases = async (req, res) => {
  try {
    const diseases = await Disease.find()
      .populate('symptoms', 'name')
      .sort({ name: 1 });

    res.json(diseases);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/diseases/library/:id
// To get a single disease's details
const getDisease = async (req, res) => {
  try {
    const disease = await Disease.findById(req.params.id)
      .populate('symptoms', 'name');

    if (!disease) {
      return res.status(404).json({
        message: 'Disease not found',
      });
    }

    res.json(disease);
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// DELETE /api/diseases/library/:id
// To delete a disease from the disease library
const deleteDisease = async (req, res) => {
  try {
    const disease = await Disease.findById(req.params.id);

    if (!disease) {
      return res.status(404).json({
        message: 'Disease not found',
      });
    }

    await disease.deleteOne();

    res.json({
      message: 'Disease deleted successfully',
    });
  } catch (err) {
    sendError(res, 500, 'Something went wrong. Please try again.', err);
  }
};

// GET /api/diseases
// To list disease cases (a farmer's own, or all for an expert)
const getDiseaseCases = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'farmer') {
      filter.farmer = req.user.id;
    }

    const cases = await DiseaseCase.find(filter)
      .select('crop status createdAt updatedAt')
      .sort({ createdAt: -1 });

    res.json(cases);
  } catch (err) {
    sendError(res, 500, 'Failed to fetch disease cases', err);
  }
};

// GET /api/diseases/:caseId
// To get a single disease case's details
const getDiseaseCase = async (req, res) => {
  try {
    const diseaseCase = await DiseaseCase.findById(req.params.caseId)
      .populate('symptoms', 'name')
      .populate('farmingConditions', 'name')
      .populate('farmer', 'name email');

    if (!diseaseCase) {
      return res.status(404).json({
        message: 'Disease case not found',
      });
    }

    if (
      req.user.role === 'farmer' &&
      diseaseCase.farmer._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized',
      });
    }

    res.json(diseaseCase);
  } catch (err) {
    sendError(res, 500, 'Failed to fetch disease case', err);
  }
};

// POST /api/diseases/:caseId/diagnosis
// To let an expert submit a diagnosis report for a disease case
const submitDiagnosisReport = async (req, res) => {
    try {
      const { caseId } = req.params;
      const { diseaseName, recommendation, additionalNotes } = req.body;

      if (!diseaseName || !recommendation) {
        return res.status(400).json({
          message: 'Disease name and recommendation are required',
        });
      }

      const diseaseCase = await DiseaseCase.findById(caseId);
      if (!diseaseCase) {
        return res.status(404).json({
          message: 'Disease case not found',
        });
      }

      diseaseCase.diagnosisReport = {
        expert: req.user.id,
        expertName: req.user.name || 'Agricultural Expert',
        diseaseName,
        recommendation,
        additionalNotes: additionalNotes || '',
        createdAt: new Date(),
      };

      diseaseCase.status = 'resolved';
      await diseaseCase.save();

      await Notification.create({
        userId: diseaseCase.farmer,
        message: `An expert has provided a Crop Diagnosis Report for your ${diseaseCase.crop.type} case.`,
        link: '/diagnosis-history',
      });

      const populatedCase = await DiseaseCase.findById(caseId)
        .populate('symptoms', 'name')
        .populate('farmingConditions', 'name')
        .populate('farmer', 'name email');

      res.json({
        message: 'Diagnosis report submitted successfully',
        diseaseCase: populatedCase,
      });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'Failed to submit diagnosis report', err);
    }
  };

  // DELETE /api/diseases/tags/:tagId
  // To delete a tag, if it isn't currently in use
  const deleteTag = async (req, res) => {
    try {
      const { tagId } = req.params;

      const tag = await Tag.findById(tagId);

      if (!tag) {
        return res.status(404).json({
          message: 'Tag not found',
        });
      }

      const inDiseaseCases = await DiseaseCase.exists({
        $or: [
          { symptoms: tagId },
          { farmingConditions: tagId },
        ],
      });

      const inDiseaseLibrary = await Disease.exists({
        symptoms: tagId,
      });

      if (inDiseaseCases || inDiseaseLibrary) {
        return res.status(400).json({
          message: 'Cannot delete tag because it is currently in use',
        });
      }

      await tag.deleteOne();

      res.json({
        message: 'Tag deleted successfully',
      });
    } catch (err) {
      sendError(res, 500, 'Failed to delete tag', err);
    }
  };

  module.exports = {
    submitDiseaseCase,
    searchTags,
    createTag,
    deleteTag,

    getDiseaseCases,
    getDiseaseCase,
    getDiseaseMatches,
    submitDiagnosisReport,

    createDisease,
    getDiseases,
    getDisease,
    deleteDisease,
  };
