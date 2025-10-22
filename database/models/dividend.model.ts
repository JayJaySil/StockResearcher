import mongoose, {Schema, model, models, Document, Model, Expression} from 'mongoose';

export interface DividendItem extends Document {
    companyId: string;
    dividendId: string;
    payDate: Date;
    dividendYield: number; // percent value, e.g., 5.17
}

const DividendSchema = new Schema<DividendItem>(
    {
        dividendId: { type: String, required: true, index: true },
        companyId: { type: String, required: true, index: true },
        payDate: { type: Date, required: true },
        dividendYield: { type: Number, required: true },
    },
    {
        timestamps: false,
    }
);

// Sorted from newest to oldest
DividendSchema.index({ payDate: -1 });

// In dev with hot-reload, Mongoose caches models. Delete the old model
// if it exists so schema changes (like renaming fields) take effect.
if (mongoose.models.Dividend) {
  try { mongoose.deleteModel('Dividend') } catch { /* ignore */ }
}
export const Dividend: Model<DividendItem> = model<DividendItem>('Dividend', DividendSchema);
