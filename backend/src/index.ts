import { buildApp } from './app.js'
import { env } from './config/env.js'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { z } from 'zod'


const app = Fastify({ logger: true })

await app.register(helmet)
await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
})

// Zod Schema Test
const PingSchema = z.object({
  message: z.string().min(1),
})

const PatientDataSchema = z.object({
  birthMonth: z.string().min(1),
  birthYear: z.string().min(1),
  height: z.string().min(1),
  weight: z.string().min(1),
  gender: z.string().min(1),
  isPregnant: z.boolean(),
  isBreastfeeding: z.boolean(),
  allergies: z.string(),
  medications: z.string(),
  substanceInfluence: z.string(),
  recentAbroad: z.boolean(),
  recentAbroadDetails: z.string(),
  conditions: z.array(z.string()),
})

const SelectedSymptomSchema = z.object({
  region: z.string().min(1),
  side: z.string().optional(),
})

const SymptomSchema = z.object({
  id: z.string().min(1),
  region: z.string().min(1),
  side: z.string().optional(),
  measurementType: z.enum(['pain', 'temperature', 'feeling', 'severity']),
  measurementValue: z.number(),
  duration: z.string().min(1),
  active: z.boolean(),
})

const AssessmentPayloadSchema = z.object({
  patientData: PatientDataSchema,
  selectedSymptoms: z.array(SelectedSymptomSchema),
  symptomDetails: z.array(SymptomSchema).min(1),
})

type CareLevel = 'emergency' | 'doctor' | 'selfcare'

type Symptom = z.infer<typeof SymptomSchema>

function isMultipleDays(duration: string) {
  return ['days', 'week', 'weeks'].includes(duration)
}

function getSymptomCareLevel(symptom: Symptom): CareLevel {
  if (symptom.measurementType === 'temperature') {
    if (symptom.measurementValue >= 40 && isMultipleDays(symptom.duration)) return 'emergency'
    if (symptom.measurementValue >= 39) return 'doctor'
    return 'selfcare'
  }

  if (symptom.measurementValue >= 8) return 'emergency'
  if (symptom.measurementValue >= 5) return 'doctor'
  return 'selfcare'
}

function getHighestCareLevel(levels: CareLevel[]): CareLevel {
  if (levels.includes('emergency')) return 'emergency'
  if (levels.includes('doctor')) return 'doctor'
  return 'selfcare'
}

function buildReasons(careLevel: CareLevel, symptoms: Symptom[]) {
  const intenseSymptoms = symptoms.filter((symptom) => symptom.measurementValue >= 8)
  const moderateSymptoms = symptoms.filter((symptom) => symptom.measurementValue >= 5 && symptom.measurementValue < 8)
  const feverSymptoms = symptoms.filter((symptom) => symptom.measurementType === 'temperature' && symptom.measurementValue >= 39)

  if (careLevel === 'emergency') {
    return [
      intenseSymptoms.length > 0
        ? 'Mindestens eine Beschwerde wurde mit sehr hoher Intensität angegeben.'
        : 'Die Angaben enthalten ein mögliches Warnzeichen.',
      'Bitte lassen Sie die Situation dringend medizinisch abklären.',
    ]
  }

  if (careLevel === 'doctor') {
    return [
      feverSymptoms.length > 0
        ? 'Es wurde hohes Fieber angegeben.'
        : 'Die Beschwerden liegen im Bereich, der ärztlich abgeklärt werden sollte.',
      moderateSymptoms.length > 0
        ? 'Mindestens eine Beschwerde wurde mit mittlerer bis hoher Intensität angegeben.'
        : 'Die Dauer oder Ausprägung der Beschwerden spricht für eine ärztliche Einschätzung.',
    ]
  }

  return [
    'Die angegebenen Beschwerden wirken aktuell eher leicht ausgeprägt.',
    'Beobachten Sie den Verlauf und suchen Sie bei Verschlechterung medizinische Hilfe.',
  ]
}


// Routes
app.get('/health', async () => ({ status: 'ok' }))

app.post('/ping', async (request, reply) => {
  const result = PingSchema.safeParse(request.body)
  if (!result.success) {
    return reply.status(400).send({ errors: result.error.flatten() })
  }
  return { pong: result.data.message }
})

app.post('/assessments', async (request, reply) => {
  const result = AssessmentPayloadSchema.safeParse(request.body)

  if (!result.success) {
    return reply.status(400).send({
      message: 'Assessment payload is invalid',
      errors: result.error.flatten(),
    })
  }

  const { symptomDetails } = result.data
  const careLevel = getHighestCareLevel(symptomDetails.map(getSymptomCareLevel))

  return reply.send({
    careLevel,
    reasons: buildReasons(careLevel, symptomDetails),
    summary: `Ausgewertet wurden ${symptomDetails.length} aktive Beschwerde(n).`,
    createdAt: new Date().toISOString(),
  })
})

// Start
try {
  await app.listen({ port: env.port, host: env.host })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
