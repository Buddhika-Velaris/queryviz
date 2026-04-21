import mongoose, { Schema, Document, Model } from 'mongoose';

// ─── Shared sub-schema ────────────────────────────────────────────────────────

const FindingSchema = new Schema(
  { severity: String, title: String, description: String, knowledgeRef: String },
  { _id: false },
);

const RecommendationSchema = new Schema(
  { priority: String, title: String, description: String, sql: String },
  { _id: false },
);

// ─── 1. Single plan analysis ──────────────────────────────────────────────────

export interface ISingleAnalysis extends Document {
  userId: string;
  email: string;
  // input
  planJson: object;
  // output
  metrics: object;
  analysis: object;
  // meta
  createdAt: Date;
}

const SingleAnalysisSchema = new Schema<ISingleAnalysis>(
  {
    userId:   { type: String, required: true, index: true },
    email:    { type: String, required: true },
    planJson: { type: Schema.Types.Mixed, required: true },
    metrics:  { type: Schema.Types.Mixed, required: true },
    analysis: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const SingleAnalysisModel: Model<ISingleAnalysis> =
  mongoose.models.SingleAnalysis ??
  mongoose.model<ISingleAnalysis>('SingleAnalysis', SingleAnalysisSchema);

// ─── 2. Plan comparison ───────────────────────────────────────────────────────

export interface IPlanComparison extends Document {
  userId: string;
  email: string;
  // input
  planA: object;
  planB: object;
  // output
  metricsA: object;
  metricsB: object;
  comparison: object;
  improvement: object;
  // meta
  createdAt: Date;
}

const PlanComparisonSchema = new Schema<IPlanComparison>(
  {
    userId:     { type: String, required: true, index: true },
    email:      { type: String, required: true },
    planA:      { type: Schema.Types.Mixed, required: true },
    planB:      { type: Schema.Types.Mixed, required: true },
    metricsA:   { type: Schema.Types.Mixed, required: true },
    metricsB:   { type: Schema.Types.Mixed, required: true },
    comparison: { type: Schema.Types.Mixed, required: true },
    improvement:{ type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const PlanComparisonModel: Model<IPlanComparison> =
  mongoose.models.PlanComparison ??
  mongoose.model<IPlanComparison>('PlanComparison', PlanComparisonSchema);

// ─── 3. Schema validation ─────────────────────────────────────────────────────

export interface ISchemaValidation extends Document {
  userId: string;
  email: string;
  // input
  sql: string;
  userContext?: string;
  // output
  result: object;
  // meta
  createdAt: Date;
}

const SchemaValidationSchema = new Schema<ISchemaValidation>(
  {
    userId:      { type: String, required: true, index: true },
    email:       { type: String, required: true },
    sql:         { type: String, required: true },
    userContext: { type: String },
    result:      { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const SchemaValidationModel: Model<ISchemaValidation> =
  mongoose.models.SchemaValidation ??
  mongoose.model<ISchemaValidation>('SchemaValidation', SchemaValidationSchema);

// ─── 4. Query generation ──────────────────────────────────────────────────────

export interface IQueryGeneration extends Document {
  userId: string;
  email: string;
  // input
  primaryDdl: string;
  accessPatterns: string;
  relatedDdl?: string;
  // output
  result: object;
  // meta
  createdAt: Date;
}

const QueryGenerationSchema = new Schema<IQueryGeneration>(
  {
    userId:         { type: String, required: true, index: true },
    email:          { type: String, required: true },
    primaryDdl:     { type: String, required: true },
    accessPatterns: { type: String, required: true },
    relatedDdl:     { type: String },
    result:         { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const QueryGenerationModel: Model<IQueryGeneration> =
  mongoose.models.QueryGeneration ??
  mongoose.model<IQueryGeneration>('QueryGeneration', QueryGenerationSchema);
