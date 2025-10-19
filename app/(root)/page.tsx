import {Button} from "@/components/ui/button";
import TradingViewWidget from "@/components/ui/TradingViewWidget";
import {MARKET_OVERVIEW_WIDGET_CONFIG, HEATMAP_WIDGET_CONFIG, TOP_STORIES_WIDGET_CONFIG, MARKET_DATA_WIDGET_CONFIG} from "@/lib/constants";
import { Star } from 'lucide-react';


const Home = async () => {

    const watchlist = []; // We'll get the actual watchlist items later

    // Empty state
    if (watchlist.length === 0) {
        return (
            <section className="flex watchlist-empty-container">
                <div className="watchlist-empty">
                    <Star className="watchlist-star" />
                    <h2 className="empty-title">Your watchlist is empty</h2>
                    <p className="empty-description">
                        Start building your watchlist by searching for stocks and clicking the star icon to add them.
                    </p>
                </div>
                {/*<SearchCommand initialStocks={initialStocks} />*/}
            </section>
        );
    }

    return (
        <section className="watchlist">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h2 className="watchlist-title">Watchlist</h2>
                    {/*<SearchCommand initialStocks={initialStocks} />*/}
                </div>
                {/* WatchlistTable */}
            </div>
        </section>
    );
}
export default Home
