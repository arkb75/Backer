import fs from "node:fs"
import path from "node:path"
import { FEED_MODEL_FEATURE_NAMES } from "@/lib/feed/mlFeatures"

export type FeedModelArtifact = {
    version: number
    trainedAt: string
    featureNames: string[]
    weights: number[]
    metrics?: {
        train?: Record<string, number>
        test?: Record<string, number>
        samples?: number
    }
    dataSummary?: Record<string, number>
}

const DEFAULT_MODEL_PATH = path.join(process.cwd(), "lib/feed/model/feed-model.json")

let cachedModel: FeedModelArtifact | null = null
let cachedModelMtimeMs: number | null = null
let cachedModelPath = ""

const resolveModelPath = (): string => {
    const configured = process.env.FEED_MODEL_PATH?.trim()
    if (!configured) return DEFAULT_MODEL_PATH
    return path.isAbsolute(configured)
        ? configured
        : path.join(process.cwd(), configured)
}

const isModelValid = (model: FeedModelArtifact): boolean => {
    if (!Array.isArray(model.weights)) return false
    if (!Array.isArray(model.featureNames)) return false
    if (model.weights.length !== FEED_MODEL_FEATURE_NAMES.length) return false
    if (model.featureNames.length !== FEED_MODEL_FEATURE_NAMES.length) return false
    if (!model.featureNames.every((name, idx) => name === FEED_MODEL_FEATURE_NAMES[idx])) {
        return false
    }
    return model.weights.every((weight) => Number.isFinite(weight))
}

export function loadFeedModel(): FeedModelArtifact | null {
    const modelPath = resolveModelPath()
    let stat: fs.Stats

    try {
        stat = fs.statSync(modelPath)
    } catch {
        return null
    }

    if (
        cachedModel &&
        cachedModelPath === modelPath &&
        cachedModelMtimeMs !== null &&
        cachedModelMtimeMs === stat.mtimeMs
    ) {
        return cachedModel
    }

    try {
        const raw = fs.readFileSync(modelPath, "utf8")
        const parsed = JSON.parse(raw) as FeedModelArtifact
        if (!isModelValid(parsed)) {
            console.warn("[FEED_MODEL_INVALID]", modelPath)
            return null
        }

        cachedModel = parsed
        cachedModelMtimeMs = stat.mtimeMs
        cachedModelPath = modelPath
        return parsed
    } catch (error) {
        console.warn("[FEED_MODEL_LOAD_ERROR]", error)
        return null
    }
}
