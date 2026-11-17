const mongoose = require('mongoose');

/**
 * Run a MongoDB transaction and always release its session. MongoDB retries
 * transient transaction failures through withTransaction when the deployment
 * supports transactions (such as a replica set or Atlas cluster).
 */
const withTransaction = async (work) => {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = { withTransaction };
