const models = require('../models');

const getUserReferences = (schema, prefix = '', arrayAncestors = []) => {
  const references = [];

  schema.eachPath((name, type) => {
    const path = prefix ? `${prefix}.${name}` : name;
    const ref = type.options?.ref || type.caster?.options?.ref || type.$embeddedSchemaType?.options?.ref;

    if (ref === 'User') {
      references.push({
        path,
        isArrayOfIds: Boolean(type.$isMongooseArray && !type.schema),
        arrayParent: arrayAncestors[arrayAncestors.length - 1] || null,
      });
    }

    if (type.schema) {
      const nestedArrays = type.$isMongooseArray ? [...arrayAncestors, path] : arrayAncestors;
      references.push(...getUserReferences(type.schema, path, nestedArrays));
    }
  });

  return references;
};

const referencePathsByModel = new Map(
  Object.entries(models).map(([name, model]) => [name, getUserReferences(model.schema)])
);

const scrubUserReferences = async (userId, session) => {
  for (const [name, model] of Object.entries(models)) {
    for (const reference of referencePathsByModel.get(name) || []) {
      const filter = { [reference.path]: userId };

      if (reference.isArrayOfIds) {
        await model.updateMany(filter, { $pull: { [reference.path]: userId } }, { session });
      } else if (reference.arrayParent) {
        const relativePath = reference.path.slice(reference.arrayParent.length + 1);
        await model.updateMany(
          filter,
          { $pull: { [reference.arrayParent]: { [relativePath]: userId } } },
          { session }
        );
      } else {
        await model.updateMany(filter, { $unset: { [reference.path]: 1 } }, { session });
      }
    }
  }
};

const deleteMany = async (name, filter, session, deletedRecords) => {
  if (name !== 'OutboxEvent') {
    const entityIds = await distinctIds(name, filter, session);
    if (entityIds.length) {
      const outboxResult = await models.OutboxEvent.deleteMany(
        { entityType: name, entityId: { $in: entityIds } },
        { session }
      );
      if (outboxResult.deletedCount) {
        deletedRecords.OutboxEvent = (deletedRecords.OutboxEvent || 0) + outboxResult.deletedCount;
      }
    }
  }

  const result = await models[name].deleteMany(filter, { session });
  if (result.deletedCount) deletedRecords[name] = (deletedRecords[name] || 0) + result.deletedCount;
};

const distinctIds = (modelName, filter, session) => models[modelName].distinct('_id', filter).session(session);

const collectPublicIds = (value, publicIds) => {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectPublicIds(entry, publicIds));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === 'publicId' && typeof nestedValue === 'string' && nestedValue) publicIds.add(nestedValue);
    else collectPublicIds(nestedValue, publicIds);
  }
};

const collectMediaIds = async (sources, session) => {
  const publicIds = new Set();
  for (const [modelName, filter, fields] of sources) {
    if (!Object.keys(filter).length) continue;
    const records = await models[modelName].find(filter).select(fields).session(session).lean();
    records.forEach((record) => collectPublicIds(record, publicIds));
  }
  return [...publicIds];
};

const deleteUserData = async (userId, session) => {
  const deletedRecords = {};
  const itemIds = await distinctIds('Item', { owner: userId }, session);
  const organizationProfileIds = await distinctIds('OrganizationProfile', { user: userId }, session);
  const technicianProfileIds = await distinctIds('TechnicianProfile', { user: userId }, session);
  const requestIds = [
    ...new Set([
      ...(await distinctIds('RepairRequest', { owner: userId }, session)).map(String),
      ...(await distinctIds('RepairRequest', { item: { $in: itemIds } }, session)).map(String),
    ]),
  ];
  const offerIds = await distinctIds(
    'DonationOffer',
    { $or: [{ owner: userId }, { item: { $in: itemIds } }] },
    session
  );
  const donationNeedIds = await distinctIds('DonationNeed', { organization: { $in: organizationProfileIds } }, session);
  const jobs = await models.RepairJob.find({
    $or: [{ owner: userId }, { technician: userId }, { repairRequest: { $in: requestIds } }],
  })
    .select('_id acceptedQuotation')
    .session(session)
    .lean();
  const jobIds = jobs.map((job) => job._id);
  const acceptedQuotationIds = jobs.map((job) => job.acceptedQuotation).filter(Boolean);
  const threadIds = await distinctIds(
    'Thread',
    { $or: [{ author: userId }, { item: { $in: itemIds } }, { repairRequest: { $in: requestIds } }] },
    session
  );
  const commentIdSet = new Set(
    (
      await distinctIds(
        'ThreadComment',
        { $or: [{ author: userId }, { thread: { $in: threadIds } }] },
        session
      )
    ).map(String)
  );
  let commentFrontier = [...commentIdSet];
  while (commentFrontier.length) {
    const childIds = await distinctIds('ThreadComment', { parentComment: { $in: commentFrontier } }, session);
    commentFrontier = childIds.map(String).filter((id) => !commentIdSet.has(id));
    commentFrontier.forEach((id) => commentIdSet.add(id));
  }
  const commentIds = [...commentIdSet];
  const disputeIds = await distinctIds(
    'Dispute',
    { $or: [{ repairJob: { $in: jobIds } }, { openedBy: userId }, { againstUser: userId }] },
    session
  );
  const mediaIds = await collectMediaIds([
    ['User', { _id: userId }, 'profileImage.publicId'],
    ['TechnicianProfile', { _id: { $in: technicianProfileIds } }, 'portfolio verificationDocuments'],
    ['OrganizationProfile', { _id: { $in: organizationProfileIds } }, 'verificationDocuments'],
    ['Item', { _id: { $in: itemIds } }, 'images'],
    ['DonationOffer', { _id: { $in: offerIds } }, 'inspection.evidencePhotos'],
    ['RepairJob', { _id: { $in: jobIds } }, 'images completionImages'],
    ['Part', { $or: [{ sourceItem: { $in: itemIds } }, { seller: userId }] }, 'images'],
  ], session);

  await deleteMany('ImpactRecord', {
    $or: [
      { item: { $in: itemIds } },
      { sourceDonation: { $in: offerIds } },
      { organization: { $in: organizationProfileIds } },
    ],
  }, session, deletedRecords);
  await deleteMany('DonationNeed', { _id: { $in: donationNeedIds } }, session, deletedRecords);
  if (organizationProfileIds.length) {
    await models.DonationOffer.updateMany(
      { 'matchedOrganizations.organization': { $in: organizationProfileIds } },
      { $pull: { matchedOrganizations: { organization: { $in: organizationProfileIds } } } },
      { session }
    );
    await models.DonationOffer.updateMany(
      { selectedOrganization: { $in: organizationProfileIds } },
      { $set: { selectedOrganization: null } },
      { session }
    );
  }
  if (donationNeedIds.length) {
    await models.DonationOffer.updateMany(
      { matchingNeed: { $in: donationNeedIds } },
      { $set: { matchingNeed: null } },
      { session }
    );
  }
  await deleteMany('Dispute', { _id: { $in: disputeIds } }, session, deletedRecords);
  await deleteMany('Warranty', {
    $or: [{ repairJob: { $in: jobIds } }, { owner: userId }, { technician: userId }],
  }, session, deletedRecords);
  await deleteMany('Review', {
    $or: [{ repairJob: { $in: jobIds } }, { reviewer: userId }, { technician: userId }],
  }, session, deletedRecords);
  await deleteMany('Part', {
    $or: [{ sourceItem: { $in: itemIds } }, { seller: userId }],
  }, session, deletedRecords);
  await deleteMany('Appointment', {
    $or: [{ repairRequest: { $in: requestIds } }, { owner: userId }, { technician: userId }],
  }, session, deletedRecords);
  await deleteMany('Quotation', {
    $or: [
      { repairRequest: { $in: requestIds } },
      { technician: userId },
      { _id: { $in: acceptedQuotationIds } },
    ],
  }, session, deletedRecords);
  await deleteMany('Inspection', {
    $or: [{ repairRequest: { $in: requestIds } }, { technician: userId }],
  }, session, deletedRecords);
  await deleteMany('TechnicianMatch', {
    $or: [{ repairRequest: { $in: requestIds } }, { technician: userId }],
  }, session, deletedRecords);
  await deleteMany('AIAnalysis', { repairRequest: { $in: requestIds } }, session, deletedRecords);
  await deleteMany('RepairStatusHistory', {
    $or: [{ repairRequest: { $in: requestIds } }, { repairJob: { $in: jobIds } }],
  }, session, deletedRecords);
  await deleteMany('Invoice', { repairJob: { $in: jobIds } }, session, deletedRecords);
  await deleteMany('PaymentTransaction', {
    $or: [{ repairJob: { $in: jobIds } }, { owner: userId }, { technician: userId }],
  }, session, deletedRecords);
  await deleteMany('Message', {
    $or: [{ repairRequest: { $in: requestIds } }, { sender: userId }, { recipient: userId }],
  }, session, deletedRecords);
  await deleteMany('RepairJob', { _id: { $in: jobIds } }, session, deletedRecords);
  await deleteMany('RepairRequest', { _id: { $in: requestIds } }, session, deletedRecords);
  await deleteMany('DonationOffer', { _id: { $in: offerIds } }, session, deletedRecords);
  await deleteMany('ThreadComment', { _id: { $in: commentIds } }, session, deletedRecords);
  await models.Thread.updateMany(
    { solvedComment: { $in: commentIds } },
    { $set: { solvedComment: null } },
    { session }
  );
  await deleteMany('Thread', { _id: { $in: threadIds } }, session, deletedRecords);
  await deleteMany('Item', { _id: { $in: itemIds } }, session, deletedRecords);
  await deleteMany('ReviewQueueItem', {
    $or: [
      { entityModel: 'User', entityId: userId },
      { entityModel: 'TechnicianProfile', entityId: { $in: technicianProfileIds } },
      { entityModel: 'OrganizationProfile', entityId: { $in: organizationProfileIds } },
      { entityModel: 'RepairRequest', entityId: { $in: requestIds } },
      { entityModel: 'Dispute', entityId: { $in: disputeIds } },
    ],
  }, session, deletedRecords);
  await deleteMany('Address', { user: userId }, session, deletedRecords);
  await deleteMany('TechnicianProfile', { _id: { $in: technicianProfileIds } }, session, deletedRecords);
  await deleteMany('ServiceTemplate', { technician: userId }, session, deletedRecords);
  await deleteMany('OrganizationProfile', { _id: { $in: organizationProfileIds } }, session, deletedRecords);
  await deleteMany('Notification', { user: userId }, session, deletedRecords);
  await deleteMany('PushSubscription', { user: userId }, session, deletedRecords);

  await scrubUserReferences(userId, session);
  await deleteMany('User', { _id: userId }, session, deletedRecords);

  return { deletedRecords, mediaIds };
};

module.exports = { deleteUserData };
