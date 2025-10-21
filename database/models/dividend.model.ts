import {Schema, model, models, Document, Model, Expression} from 'mongoose';

export interface DividendItem extends Document {
    companyId: string;
    dividendId: string;
    payDate: Date;
    divPerShare: number;
    dividendYield?: number; // percent value, e.g., 2.66 means 2.66%
}

const DividendSchema = new Schema<DividendItem>(
    {
        dividendId: { type: String, required: true, index: true },
        companyId: { type: String, required: true, index: true },
        payDate: { type: Date, required: true },
        divPerShare: { type: Number, required: true },
        dividendYield: { type: Number, required: false, default: null },
    },
    {
        timestamps: false,
    }
);

// Sorted from newest to oldest
DividendSchema.index({ payDate: -1 });

export const Dividend: Model<DividendItem> =
    (models?.Dividend as Model<DividendItem>) || model<DividendItem>('Dividend', DividendSchema);
