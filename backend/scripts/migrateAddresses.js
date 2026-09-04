/**
 * One-off migration: move legacy flat address fields into the nested
 * `address` subdocument used by User, Expert and Organization.
 *
 * Safe to run more than once. A document is only touched when it still has
 * legacy data that has not been copied across yet, and nothing is ever
 * deleted — the old fields are left in place so the change can be reviewed.
 *
 * Usage:
 *   cd backend && node scripts/migrateAddresses.js          (apply)
 *   cd backend && node scripts/migrateAddresses.js --dry-run (preview only)
 */
require('dotenv').config();
const mongoose = require('mongoose');

const DEFAULT_COUNTRY = 'Bangladesh';
const DRY_RUN = process.argv.includes('--dry-run');

function cleanValue(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

// True when the document already has a usable nested address
function alreadyMigrated(doc) {
  const address = doc.address;
  if (!address || typeof address !== 'object') return false;

  const hasPlace =
    cleanValue(address.district) ||
    cleanValue(address.upazila) ||
    cleanValue(address.division) ||
    cleanValue(address.state) ||
    cleanValue(address.addressLine);

  // A country on its own is just the schema default, so it does not count
  // as migrated when legacy place data is still sitting in the old fields.
  return Boolean(hasPlace);
}

// True when the document still carries legacy values worth copying
function hasLegacyData(doc) {
  if (cleanValue(doc.district)) return true;
  if (cleanValue(doc.upazila)) return true;
  // Expert/Organization used to store a free-text address string
  if (typeof doc.address === 'string' && cleanValue(doc.address)) return true;
  return false;
}

function buildAddressFromLegacy(doc) {
  const existing = doc.address && typeof doc.address === 'object' ? doc.address : {};

  let addressLine = cleanValue(existing.addressLine);
  if (!addressLine && typeof doc.address === 'string') {
    addressLine = cleanValue(doc.address);
  }

  return {
    country: cleanValue(existing.country) || DEFAULT_COUNTRY,
    division: cleanValue(existing.division),
    state: cleanValue(existing.state),
    district: cleanValue(existing.district) || cleanValue(doc.district),
    upazila: cleanValue(existing.upazila) || cleanValue(doc.upazila),
    addressLine,
  };
}

async function migrateCollection(collectionName) {
  const collection = mongoose.connection.collection(collectionName);
  const documents = await collection.find({}).toArray();

  let migrated = 0;
  let skipped = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];

    if (alreadyMigrated(doc)) {
      skipped += 1;
      continue;
    }

    if (!hasLegacyData(doc)) {
      // Nothing to copy; the schema default fills in the country on save
      skipped += 1;
      continue;
    }

    const address = buildAddressFromLegacy(doc);

    if (!DRY_RUN) {
      await collection.updateOne({ _id: doc._id }, { $set: { address } });
    }

    migrated += 1;

    if (migrated <= 5) {
      console.log(`  ${collectionName}: ${doc._id} ->`, JSON.stringify(address));
    }
  }

  console.log(`${collectionName}: ${migrated} migrated, ${skipped} already fine/no legacy data`);
  return { migrated, skipped };
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Add it to backend/.env before running.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(DRY_RUN ? 'DRY RUN — no documents will be changed' : 'Applying migration');

  const collections = ['users', 'experts', 'organizations'];
  let total = 0;

  for (let i = 0; i < collections.length; i++) {
    const result = await migrateCollection(collections[i]);
    total += result.migrated;
  }

  console.log(`\nDone. ${total} document(s) ${DRY_RUN ? 'would be' : 'were'} updated.`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Migration failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // Nothing else to clean up
  }
  process.exit(1);
});
