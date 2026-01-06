///https://www.youtube.com/watch?v=gu4pafNCXng
//Mongoose schema for Summary

import {Schema, model, models, Document, Model} from 'mongoose';

export interface SummaryItem extends Document {
    companyId: string;
    summaryId: string;
    summary?: string;
    addedAt?: Date;
}

const SummarySchema = new Schema<SummaryItem>(
    {
        summaryId: { type: String, required: true, index: true },
        // Do not set `index: true` here; a unique index is declared below.
        companyId: { type: String, required: true },
        summary: { type: String, default: null },
        addedAt: { type: Date, default: Date.now },
    },
    {
        timestamps: false,
    }
);

// Compound index to ensure a user cannot add the same stock twice
SummarySchema.index({ companyId: 1 }, { unique: true });

export const Summary: Model<SummaryItem> =
    (models?.Summary as Model<SummaryItem>) || model<SummaryItem>('Summary', SummarySchema);
