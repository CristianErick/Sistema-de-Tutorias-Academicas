const { error } = require('../utils/response');

function validate(schema) {
  return (req, res, next) => {
    const { error: validationError, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (validationError) {
      const messages = validationError.details.map((d) => d.message).join(', ');
      return error(res, messages, 400);
    }

    req.body = value;
    next();
  };
}

module.exports = validate;
