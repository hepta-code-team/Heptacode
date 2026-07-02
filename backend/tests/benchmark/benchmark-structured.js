import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const url = "http://localhost:3000/assessments";

// Anzahl der gewerteten Messungen
const runs = 10;

// Warm-up-Aufrufe werden nicht ausgewertet
const warmups = 1;

const payload = {
  patientData: {
    birthMonth: "05",
    birthYear: "1988",
    height: "175",
    weight: "78",
    gender: "Maennlich",
    isPregnant: false,
    isBreastfeeding: false,
    allergies: "",
    medications: "",
    medicationDuration: "",
    substanceInfluence: "",
    recentAbroad: "",
    recentAbroadDetails: "",
    conditions: [],
    isSmoker: "",
    smokingSinceYears: "",
    cigarettesPerDay: "",
    conditionDetails: {}
  },

  selectedSymptoms: [
    {
      region: "Kopf"
    }
  ],

  symptomDetails: [
    {
      id: "benchmark-1",
      region: "Kopf",
      measurementType: "pain",
      measurementValue: 7,
      duration: "weeks",
      active: true
    }
  ]
};

async function measure() {
  const startedAt = performance.now();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const durationMs = performance.now() - startedAt;

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Backend lieferte keine gültige JSON-Antwort. HTTP-Status: ${response.status}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${JSON.stringify(result, null, 2)}`
    );
  }

  return {
    durationMs,
    careLevel: result.careLevel,
    specialty: result.recommendedSpecialty ?? null,
    aiModel: result.aiModel ?? "unbekannt",
    aiUnavailable: result.aiUnavailable ?? false
  };
}

function percentile(sortedValues, percentileValue) {
  const index =
    Math.ceil((percentileValue / 100) * sortedValues.length) - 1;

  return sortedValues[Math.max(0, index)];
}

async function runBenchmark() {
  console.log(`Benchmark-Ziel: ${url}`);
  console.log(`Warm-ups: ${warmups}`);
  console.log(`Gewertete Durchläufe: ${runs}`);
  console.log("");

  for (let index = 0; index < warmups; index++) {
    process.stdout.write(`Warm-up ${index + 1}/${warmups} ... `);

    const result = await measure();

    console.log(
      `${(result.durationMs / 1000).toFixed(2)} s | Modell: ${result.aiModel}`
    );
  }

  console.log("");
  console.log("Starte Messungen ...");

  const results = [];

  for (let index = 0; index < runs; index++) {
    const result = await measure();
    results.push(result);

    console.log(
      [
        `Durchlauf ${index + 1}/${runs}`,
        `${(result.durationMs / 1000).toFixed(2)} s`,
        `Modell: ${result.aiModel}`,
        `Care Level: ${result.careLevel}`,
        `Fachrichtung: ${result.specialty ?? "keine"}`
      ].join(" | ")
    );
  }

  const durations = results
    .map((result) => result.durationMs)
    .sort((a, b) => a - b);

  const meanMs =
    durations.reduce((sum, duration) => sum + duration, 0) /
    durations.length;

  const models = [
    ...new Set(results.map((result) => result.aiModel))
  ];

  const summary = {
    createdAt: new Date().toISOString(),
    url,
    models,
    runs,
    warmups,
    meanMs: Math.round(meanMs),
    medianMs: Math.round(percentile(durations, 50)),
    p95Ms: Math.round(percentile(durations, 95)),
    minMs: Math.round(durations[0]),
    maxMs: Math.round(durations.at(-1)),
    fallbackCount: results.filter(
      (result) => result.aiUnavailable
    ).length,
    results
  };

  console.log("");
  console.log("Ergebnis:");

  console.table({
    Modelle: summary.models.join(", "),
    Durchlaeufe: summary.runs,
    "Mittelwert (s)": (summary.meanMs / 1000).toFixed(2),
    "Median (s)": (summary.medianMs / 1000).toFixed(2),
    "p95 (s)": (summary.p95Ms / 1000).toFixed(2),
    "Minimum (s)": (summary.minMs / 1000).toFixed(2),
    "Maximum (s)": (summary.maxMs / 1000).toFixed(2),
    Fallbacks: summary.fallbackCount
  });

  const outputFile = process.argv[2] ?? "benchmark-result.json";

  await writeFile(
    outputFile,
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  console.log(`Ergebnis gespeichert unter: ${outputFile}`);
}

runBenchmark().catch((error) => {
  console.error("");
  console.error("Benchmark fehlgeschlagen:");
  console.error(error);
  process.exitCode = 1;
});