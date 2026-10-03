const validateId = (value) => {
  const id = Number(value);

  return Number.isInteger(id) && id > 0;
};

module.exports = validateId;
