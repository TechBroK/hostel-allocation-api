// src/services/allocationAlgorithm.js
// Compatibility & allocation suggestion engine (pure functions + lightweight state hooks)

import crypto from "crypto";

import ApprovedPairing from "../models/ApprovedPairing.js";

// Base weights (can be adjusted over time via admin-approved learning)
let WEIGHTS = {
  sleepSchedule: 1,
  studyHabits: 1,
  cleanlinessLevel: 1.2,
  socialPreference: 1,
  noisePreference: 1,
  hobbies: 0.6,
  musicPreference: 0.4,
  visitorFrequency: 0.8,
};

// Simple in-memory history of admin-approved pairings to influence weights (placeholder)
// In-memory cache for trait signatures and suggestion results (TTL-based)
const suggestionCache = new Map(); // key: studentId|signature -> { expires, data }
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function recordApprovedPairing({ studentIdA, studentIdB, approvedBy }) {
  // Normalize ordering to keep uniqueness stable
  const ordered = [studentIdA.toString(), studentIdB.toString()].sort();
  const doc = await ApprovedPairing.findOneAndUpdate(
    { studentIdA: ordered[0], studentIdB: ordered[1] },
    { $setOnInsert: { approvedBy, weightSnapshot: { ...WEIGHTS } } },
    { upsert: true, new: true }
  );
  await maybeRecalculateWeights();
  return doc;
}

export async function listApprovedPairings() {
  return ApprovedPairing.find().lean();
}

async function maybeRecalculateWeights() {
  const count = await ApprovedPairing.countDocuments();
  if (count === 0 || count % 25 !== 0) {
    return;
  }
  // Simple adaptive sample: if many approvals accumulate, slightly raise weight on cleanliness & sleep (bounded)
  WEIGHTS.cleanlinessLevel = Math.min(1.6, WEIGHTS.cleanlinessLevel + 0.02);
  WEIGHTS.sleepSchedule = Math.min(1.3, WEIGHTS.sleepSchedule + 0.01);
}

// Normalization maps for categorical fields
const mapOrdinal = (value, map) => (value in map ? map[value] : 0.5);

const SLEEP_MAP = { early: 0, flexible: 0.5, late: 1 };
const STUDY_MAP = { quiet: 0, mixed: 0.5, group: 1 };
const SOCIAL_MAP = { introvert: 0, balanced: 0.5, extrovert: 1 };
const NOISE_MAP = { quiet: 0, tolerant: 0.5, noisy: 1 };
const VISITOR_MAP = { rarely: 0, sometimes: 0.5, often: 1 };

function normalizeTraits(personality = {}) {
  return {
    sleepSchedule: mapOrdinal((personality.sleepSchedule || "").toLowerCase(), SLEEP_MAP),
    studyHabits: mapOrdinal((personality.studyHabits || "").toLowerCase(), STUDY_MAP),
    cleanlinessLevel: clampNumber(personality.cleanlinessLevel, 1, 5) / 5, // scale to 0..1
    socialPreference: mapOrdinal((personality.socialPreference || "").toLowerCase(), SOCIAL_MAP),
    noisePreference: mapOrdinal((personality.noisePreference || "").toLowerCase(), NOISE_MAP),
    visitorFrequency: mapOrdinal((personality.visitorFrequency || "").toLowerCase(), VISITOR_MAP),
    hobbies: Array.isArray(personality.hobbies) ? personality.hobbies.map((h) => h.toLowerCase()) : [],
    musicPreference: (personality.musicPreference || "").toLowerCase(),
  };
}

function clampNumber(n, min, max) {
  if (typeof n !== "number") {
    return min;
  }
  return Math.min(max, Math.max(min, n));
}

// Convert normalized traits to vector for distance-based similarity
function toNumericVector(norm) {
  return [
    norm.sleepSchedule,
    norm.studyHabits,
    norm.cleanlinessLevel,
    norm.socialPreference,
    norm.noisePreference,
    norm.visitorFrequency,
  ];
}

function weightedEuclidean(aVec, bVec, weightsArr) {
  let sum = 0;
  for (let i = 0; i < aVec.length; i += 1) {
    const diff = aVec[i] - bVec[i];
    sum += (diff * diff) * (weightsArr[i] || 1);
  }
  return Math.sqrt(sum);
}

function vectorMagnitude(vec, weightsArr) {
  let sum = 0;
  for (let i = 0; i < vec.length; i += 1) {
    sum += (vec[i] * vec[i]) * (weightsArr[i] || 1);
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(aVec, bVec, weightsArr) {
  let dot = 0;
  for (let i = 0; i < aVec.length; i += 1) {
    dot += (aVec[i] * bVec[i]) * (weightsArr[i] || 1);
  }
  const mag = vectorMagnitude(aVec, weightsArr) * vectorMagnitude(bVec, weightsArr);
  if (mag === 0) {
    return 0.5; // neutral baseline
  }
  return dot / mag;
}

// Calculate hobby/music overlap (Jaccard for hobbies, equality for music)
function interestAffinity(aNorm, bNorm) {
  const hobbiesA = new Set(aNorm.hobbies);
  const hobbiesB = new Set(bNorm.hobbies);
  const intersection = [...hobbiesA].filter((h) => hobbiesB.has(h));
  const union = new Set([...hobbiesA, ...hobbiesB]);
  const hobbyScore = union.size === 0 ? 0.5 : intersection.length / union.size; // 0..1
  const musicScore = aNorm.musicPreference && bNorm.musicPreference
    ? (aNorm.musicPreference === bNorm.musicPreference ? 1 : 0)
    : 0.5;
  return { hobbyScore, musicScore };
}

function penalty(aNorm, bNorm) {
  // Opposite extremes penalty examples
  let p = 0;
  if (Math.abs(aNorm.cleanlinessLevel - bNorm.cleanlinessLevel) > 0.8) {
    p += 0.1;
  }
  if (Math.abs(aNorm.sleepSchedule - bNorm.sleepSchedule) > 0.8) {
    p += 0.1;
  }
  if (Math.abs(aNorm.noisePreference - bNorm.noisePreference) > 0.8) {
    p += 0.1;
  }
  return p; // 0..0.3
}

export function computeCompatibility(studentA, studentB, options = {}) {
  const { method = "cosine" } = options;
  const aNorm = normalizeTraits(studentA.personalityTraits);
  const bNorm = normalizeTraits(studentB.personalityTraits);
  const aVec = toNumericVector(aNorm);
  const bVec = toNumericVector(bNorm);
  // Map weights order to vector order
  const weightsArr = [
    WEIGHTS.sleepSchedule,
    WEIGHTS.studyHabits,
    WEIGHTS.cleanlinessLevel,
    WEIGHTS.socialPreference,
    WEIGHTS.noisePreference,
    WEIGHTS.visitorFrequency,
  ];
  const base = method === "euclidean"
    ? 1 - Math.min(1, weightedEuclidean(aVec, bVec, weightsArr))
    : cosineSimilarity(aVec, bVec, weightsArr); // 0..1
  const { hobbyScore, musicScore } = interestAffinity(aNorm, bNorm);
  const affinityBlend = (hobbyScore * WEIGHTS.hobbies + musicScore * WEIGHTS.musicPreference) /
    (WEIGHTS.hobbies + WEIGHTS.musicPreference);
  const raw = (base * 0.75) + (affinityBlend * 0.25);
  const penalized = Math.max(0, raw - penalty(aNorm, bNorm));
  const pct = Math.round(penalized * 100);
  return {
    score: pct,
    range: classifyCompatibilityRange(pct),
    breakdown: { base: round2(base), affinity: round2(affinityBlend) },
  };
}
// New classification (exported for tests & documentation):
// 85-100 veryHigh | 70-84 high | 55-69 moderate | <55 low
export function classifyCompatibilityRange(pct) {
  if (pct >= 85) { return "veryHigh"; }
  if (pct >= 70) { return "high"; }
  if (pct >= 55) { return "moderate"; }
  return "low";
}

function round2(n) { return Math.round(n * 100) / 100; }

export function allocateStudent(targetStudent, candidateStudents, { method } = {}) {
  const results = [];
  for (const s of candidateStudents) {
    if (!s || !s._id || s._id.toString() === targetStudent._id.toString()) {
      continue;
    }
    const { score, range, breakdown } = computeCompatibility(targetStudent, s, { method });
    results.push({
      studentId: targetStudent._id,
      matchId: s._id,
      compatibilityScore: score,
      range,
      status: deriveStatus(range, score),
      breakdown,
    });
  }
  results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  return groupByRange(results);
}

function deriveStatus(range, score) {
  if (range === "veryHigh") { return "auto-pair"; }
  if (range === "high") { return score >= 75 ? "suggest" : "awaiting-review"; }
  if (range === "moderate") { return "needs-admin"; }
  return "reject";
}

function groupByRange(list) {
  return {
    veryHigh: list.filter((r) => r.range === "veryHigh"),
    high: list.filter((r) => r.range === "high"),
    moderate: list.filter((r) => r.range === "moderate"),
    low: list.filter((r) => r.range === "low"),
    all: list,
  };
}

export function getWeights() { return { ...WEIGHTS }; }
export function setWeights(next) { WEIGHTS = { ...WEIGHTS, ...next }; }

// Utility to generate a deterministic hash of traits (could be used for caching later)
export function traitSignature(student) {
  const norm = normalizeTraits(student.personalityTraits || {});
  return crypto.createHash("sha1").update(JSON.stringify(norm)).digest("hex").slice(0, 16);
}

export function cacheSuggestions(studentId, signature, data, ttlMs = DEFAULT_TTL_MS) {
  suggestionCache.set(`${studentId}|${signature}`, { expires: Date.now() + ttlMs, data });
}

export function getCachedSuggestions(studentId, signature) {
  const key = `${studentId}|${signature}`;
  const entry = suggestionCache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expires) {
    suggestionCache.delete(key);
    return null;
  }
  return entry.data;
}

export default {
  allocateStudent,
  computeCompatibility,
  recordApprovedPairing,
  traitSignature,
  getWeights,
  setWeights,
  classifyCompatibilityRange,
};
