import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const baseUrl = "http://localhost:3000";
const runsPerCase = 3;
const warmups = 1;

const patientData = {
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
  substanceInfluence: "Nein",
  recentAbroad: false,
  recentAbroadDetails: "",
  conditions: [],
  isSmoker: false,
  smokingSinceYears: "",
  cigarettesPerDay: "",
  conditionDetails: {}
};

const testCases = [
  {
    name: "Kopfschmerzen",
    text: "Ich habe seit mehreren Wochen starke Kopfschmerzen, vor allem auf der linken Seite.",
    expectedRegion: "Kopf"
  },
  {
    name: "Bauchschmerzen",
    text: "Ich habe seit ein paar Tagen mittelstarke Schmerzen im rechten Unterbauch, und starke Übelkeit.",
    expectedRegion: "Bauch"
  },
  {
    name: "Rueckenschmerzen",
    text: "Seit heute habe ich starke Schmerzen im unteren Rücken, und kann nicht gut Schlafen.",
    expectedRegion: "Rücken"
  },
  {
    name: "Fieber",
    text: "Seit ein paar Tagen habe ich 39,2 Grad Fieber. Ich fühle mich sehr schwach.",
    expectedRegion: "Allgemein"
  }
];

async function postJson(path, payload) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
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
      `${path} lieferte keine gültige JSON-Antwort. HTTP-Status: ${response.status}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `${path} antwortete mit HTTP ${response.status}: ${JSON.stringify(result)}`
    );
  }

  return { result, durationMs };
}

function hasCompleteAssessmentFields(symptom) {
  return (
    typeof symptom.region === "string" &&
    symptom.region.length > 0 &&
    typeof symptom.measurementType === "string" &&
    typeof symptom.measurementValue === "number" &&
    typeof symptom.duration === "string"
  );
}

function createAssessmentPayload(extractedSymptoms) {
  return {
    patientData,
    selectedSymptoms: extractedSymptoms.map((symptom) => ({
      region: symptom.region,
      ...(symptom.side ? { side: symptom.side } : {})
    })),
    symptomDetails: extractedSymptoms.map((symptom, index) => ({
      id: `benchmark-${index + 1}`,
      region: symptom.region,
      ...(symptom.side ? { side: symptom.side } : {}),
      ...(symptom.details ? { details: symptom.details } : {}),
      measurementType: symptom.measurementType,
      measurementValue: symptom.measurementValue,
      duration: symptom.duration,
      active: true
    }))
  };
}

async function runCase(testCase) {
  const totalStartedAt = performance.now();

  const extraction = await postJson("/api/v1/symptoms/extraction", {
    symptomText: testCase.text,
    inputType: "text",
    patientData
  });

  const extractedSymptoms = Array.isArray(extraction.result.symptoms)
    ? extraction.result.symptoms
    : [];
  const extractedRegions = extractedSymptoms.map((symptom) => symptom.region);
  const expectedRegionFound = extractedRegions.includes(testCase.expectedRegion);
  const extractionComplete =
    extractedSymptoms.length > 0 &&
    extractedSymptoms.every(hasCompleteAssessmentFields);

  if (
    extraction.result.invalidInput ||
    extraction.result.aiUnavailable ||
    !extractionComplete
  ) {
    return {
      caseName: testCase.name,
      text: testCase.text,
      expectedRegion: testCase.expectedRegion,
      extractedRegions,
      expectedRegionFound,
      extractionComplete,
      extractionMs: extraction.durationMs,
      assessmentMs: null,
      totalMs: performance.now() - totalStartedAt,
      extractionAiUnavailable: extraction.result.aiUnavailable ?? false,
      invalidInput: extraction.result.invalidInput ?? false,
      assessmentAiUnavailable: null,
      aiModel: null,
      careLevel: null,
      specialty: null,
      message: extraction.result.message ?? null
    };
  }

  const assessment = await postJson(
    "/assessments",
    createAssessmentPayload(extractedSymptoms)
  );

  return {
    caseName: testCase.name,
    text: testCase.text,
    expectedRegion: testCase.expectedRegion,
    extractedRegions,
    expectedRegionFound,
    extractionComplete,
    extractionMs: extraction.durationMs,
    assessmentMs: assessment.durationMs,
    totalMs: performance.now() - totalStartedAt,
    extractionAiUnavailable: extraction.result.aiUnavailable ?? false,
    invalidInput: extraction.result.invalidInput ?? false,
    assessmentAiUnavailable: assessment.result.aiUnavailable ?? false,
    aiModel: assessment.result.aiModel ?? "unbekannt",
    careLevel: assessment.result.careLevel ?? null,
    specialty: assessment.result.recommendedSpecialty ?? null,
    message: null
  };
}

function calculateMetrics(values) {
  const sorted = values
    .filter((value) => typeof value === "number")
    .sort((a, b) => a - b);

  if (sorted.length === 0) {
    return null;
  }

  const percentile = (value) => {
    const index = Math.ceil((value / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };

  return {
    count: sorted.length,
    meanMs: Math.round(
      sorted.reduce((sum, value) => sum + value, 0) / sorted.length
    ),
    medianMs: Math.round(percentile(50)),
    p95Ms: Math.round(percentile(95)),
    minMs: Math.round(sorted[0]),
    maxMs: Math.round(sorted.at(-1))
  };
}

function seconds(value) {
  return typeof value === "number" ? `${(value / 1000).toFixed(2)} s` : "–";
}

async function main() {
  const outputFile = process.argv[2] ?? "benchmark-freetext-result.json";
  const versionLabel = process.argv[3] ?? "unbenannt";

  console.log(`Version: ${versionLabel}`);
  console.log(`Backend: ${baseUrl}`);
  console.log(`Testfälle: ${testCases.length}`);
  console.log(`Durchläufe pro Fall: ${runsPerCase}`);
  console.log("");

  for (let index = 0; index < warmups; index++) {
    process.stdout.write(`Warm-up ${index + 1}/${warmups} ... `);
    const result = await runCase(testCases[0]);
    console.log(seconds(result.totalMs));
  }

  const results = [];

  for (const testCase of testCases) {
    console.log("");
    console.log(`Fall: ${testCase.name}`);

    for (let run = 0; run < runsPerCase; run++) {
      const result = await runCase(testCase);
      results.push(result);

      console.log(
        [
          `${run + 1}/${runsPerCase}`,
          `Extraktion: ${seconds(result.extractionMs)}`,
          `Triage: ${seconds(result.assessmentMs)}`,
          `Gesamt: ${seconds(result.totalMs)}`,
          `Region: ${result.extractedRegions.join(", ") || "keine"}`,
          `Modell: ${result.aiModel ?? "keine Triage"}`,
          result.expectedRegionFound ? "Region korrekt" : "Region abweichend",
          result.extractionComplete ? "Daten vollständig" : "Daten unvollständig"
        ].join(" | ")
      );
    }
  }

  const successfulPipelineResults = results.filter(
    (result) => result.assessmentMs !== null
  );

  const summary = {
    createdAt: new Date().toISOString(),
    versionLabel,
    baseUrl,
    runsPerCase,
    warmups,
    testCaseCount: testCases.length,
    measuredRuns: results.length,
    successfulPipelineRuns: successfulPipelineResults.length,
    expectedRegionHitRate:
      results.filter((result) => result.expectedRegionFound).length / results.length,
    extractionCompleteRate:
      results.filter((result) => result.extractionComplete).length / results.length,
    extractionFallbackCount: results.filter(
      (result) => result.extractionAiUnavailable
    ).length,
    assessmentFallbackCount: results.filter(
      (result) => result.assessmentAiUnavailable
    ).length,
    models: [
      ...new Set(
        results
          .map((result) => result.aiModel)
          .filter((model) => model && model !== "unbekannt")
      )
    ],
    extraction: calculateMetrics(results.map((result) => result.extractionMs)),
    assessment: calculateMetrics(results.map((result) => result.assessmentMs)),
    total: calculateMetrics(results.map((result) => result.totalMs)),
    perCase: Object.fromEntries(
      testCases.map((testCase) => {
        const caseResults = results.filter(
          (result) => result.caseName === testCase.name
        );

        return [
          testCase.name,
          {
            expectedRegion: testCase.expectedRegion,
            expectedRegionHitRate:
              caseResults.filter((result) => result.expectedRegionFound).length /
              caseResults.length,
            extractionCompleteRate:
              caseResults.filter((result) => result.extractionComplete).length /
              caseResults.length,
            extraction: calculateMetrics(
              caseResults.map((result) => result.extractionMs)
            ),
            assessment: calculateMetrics(
              caseResults.map((result) => result.assessmentMs)
            ),
            total: calculateMetrics(caseResults.map((result) => result.totalMs))
          }
        ];
      })
    ),
    results
  };

  console.log("");
  console.log("Gesamtergebnis:");
  console.table({
    Version: versionLabel,
    Modelle: summary.models.join(", ") || "unbekannt",
    Messungen: summary.measuredRuns,
    "Pipeline erfolgreich": summary.successfulPipelineRuns,
    "Region korrekt": `${(summary.expectedRegionHitRate * 100).toFixed(1)} %`,
    "Extraktion vollstaendig": `${(summary.extractionCompleteRate * 100).toFixed(1)} %`,
    "Extraktion Median": seconds(summary.extraction?.medianMs),
    "Triage Median": seconds(summary.assessment?.medianMs),
    "Gesamt Median": seconds(summary.total?.medianMs),
    "Gesamt p95": seconds(summary.total?.p95Ms),
    "Extraktion Fallbacks": summary.extractionFallbackCount,
    "Triage Fallbacks": summary.assessmentFallbackCount
  });

  await writeFile(outputFile, JSON.stringify(summary, null, 2), "utf8");
  console.log(`Ergebnis gespeichert unter: ${outputFile}`);
}

main().catch((error) => {
  console.error("");
  console.error("Freitext-Benchmark fehlgeschlagen:");
  console.error(error);
  process.exitCode = 1;
});
