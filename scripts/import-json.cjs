
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('node:fs');
const path = require('node:path');

const serviceAccount = require('../serviceAccountKey.json');

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

function readJson(fileName) {
  const filePath = path.join(__dirname, '..', 'public', fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function importCollection(collectionName, records) {
  if (!Array.isArray(records)) {
    throw new Error(`${collectionName}.json bir JSON dizisi olmalı.`);
  }

  for (let start = 0; start < records.length; start += 400) {
    const batch = db.batch();

    for (const record of records.slice(start, start + 400)) {
      if (record.id === undefined || record.id === null) {
        throw new Error(`${collectionName} içinde id eksik.`);
      }

      const ref = db
        .collection(collectionName)
        .doc(String(record.id));

      batch.set(ref, record);
    }

    await batch.commit();
  }

  console.log(`${collectionName}: ${records.length} kayıt aktarıldı.`);
}

async function main() {
  const words = readJson('words.json');
  const sentences = readJson('sentences.json');

  await importCollection('words', words);
  await importCollection('sentences', sentences);

  console.log('JSON aktarımı tamamlandı.');
}

main()
  .catch((error) => {
    console.error('Aktarım başarısız:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await app.delete();
  });
