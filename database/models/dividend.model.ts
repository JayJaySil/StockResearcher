import {Schema, model, models, Document, Model, Expression} from 'mongoose';

export interface DividendItem extends Document {
    companyId: string;
    dividendId: string;
    payDate: Date;
    divPerShare: number;
}

const DividendSchema = new Schema<DividendItem>(
    {
        dividendId: { type: String, required: true, index: true },
        companyId: { type: String, required: true, index: true },
        payDate: { type: Date, required: true },
        divPerShare: { type: Number, required: true },
    },
    {
        timestamps: false,
    }
);

// Sorted from newest to oldest
DividendSchema.index({ payDate: -1 });

export const Dividend: Model<DividendItem> =
    (models?.Dividend as Model<DividendItem>) || model<DividendItem>('Dividend', DividendSchema);
