function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.name === "ZodError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues || err.errors,
    });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: "A record with that value already exists" });
  }
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { notFound, errorHandler, asyncHandler, httpError };
