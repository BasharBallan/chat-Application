const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");
const getMessage = require("../utils/getMessage");

// ------------------------------------------------------
// CREATE ONE
// ------------------------------------------------------
exports.createOne = (Model) =>
  asyncHandler(async (req, res) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: "success",
      message: getMessage(`${Model.modelName.toLowerCase()}_created`, req.lang),
      data: doc,
    });
  });

// ------------------------------------------------------
// GET ONE
// ------------------------------------------------------
exports.getOne = (Model, populateOptions) =>
  asyncHandler(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (populateOptions) query = query.populate(populateOptions);

    const doc = await query;

    if (!doc) {
      return next(new ApiError(getMessage("not_found", req.lang), 404));
    }

    res.status(200).json({
      status: "success",
      message: getMessage(`${Model.modelName.toLowerCase()}_fetched`, req.lang),
      data: doc,
    });
  });

// ------------------------------------------------------
// GET ALL
// ------------------------------------------------------
exports.getAll = (Model) =>
  asyncHandler(async (req, res) => {
    const filter = req.filterObj || {};

    const totalDocuments = await Model.countDocuments(filter);

    const apiFeatures = new ApiFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate(totalDocuments);

    const { mongooseQuery, paginationResult } = apiFeatures;
    const docs = await mongooseQuery;

    res.status(200).json({
      status: "success",
      message: getMessage(`${Model.modelName.toLowerCase()}_list`, req.lang),
      results: docs.length,
      paginationResult,
      data: docs,
    });
  });

// ------------------------------------------------------
// UPDATE ONE
// ------------------------------------------------------
exports.updateOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new ApiError(getMessage("not_found", req.lang), 404));
    }

    res.status(200).json({
      status: "success",
      message: getMessage(`${Model.modelName.toLowerCase()}_updated`, req.lang),
      data: doc,
    });
  });

// ------------------------------------------------------
// DELETE ONE
// ------------------------------------------------------
exports.deleteOne = (Model) =>
  asyncHandler(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new ApiError(getMessage("not_found", req.lang), 404));
    }

    res.status(200).json({
      status: "success",
      message: getMessage(`${Model.modelName.toLowerCase()}_deleted`, req.lang),
    });
  });
