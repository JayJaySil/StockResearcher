//https://www.youtube.com/watch?v=gu4pafNCXng
//Mongoose schema for Company

import {Schema, model, models, Document, Model} from 'mongoose';
export interface CompanyItem extends Document {
    userId: string;
    companyId: string;
    symbol: string;
    favourite?: boolean;
    addedAt?: Date;
}

const CompanySchema = new Schema<CompanyItem>(
    {
        userId: { type: String, required: true, index: true },
        companyId: { type: String, required: true, index: true },
        symbol: { type: String, required: true, uppercase: true, trim: true },
        favourite: { type: Boolean, default: false },
        addedAt: { type: Date, default: Date.now },
    },
    {
        timestamps: false,
    }
);

// Compound index to ensure a user cannot add the same company twice
CompanySchema.index({ userId: 1, symbol: 1 }, { unique: true });

export const Company: Model<CompanyItem> =
    (models?.Company as Model<CompanyItem>) || model<CompanyItem>('Company', CompanySchema);

