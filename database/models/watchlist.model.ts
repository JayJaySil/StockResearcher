import {Schema, model, models, Document, Model} from 'mongoose';

export interface WatchlistItem extends Document {
  userId: string;
  companyId: string;
  symbol: string;
  company: string;
  favourite: boolean;
  addedAt: Date;
}

const WatchlistSchema = new Schema<WatchlistItem>(
  {
    userId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    company: { type: String, required: true, trim: true },
    favourite: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

// Compound index to ensure a user cannot add the same stock twice
WatchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export const Watchlist: Model<WatchlistItem> =
    (models?.Watchlist as Model<WatchlistItem>) || model<WatchlistItem>('Watchlist', WatchlistSchema);
