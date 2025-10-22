// Background jobs powered by Inngest (welcome email, daily news, etc).
import {inngest} from "@/lib/inngest/client";
import {PERSONALIZED_WELCOME_EMAIL_PROMPT} from "@/lib/inngest/prompt";
import {sendWelcomeEmail} from "@/lib/nodemailer";
import {getAllUsersForNewsEmail} from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";

export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email' },
    { event: 'app/user.created'},
    async ({ event, step }) => {
        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        const response = await step.ai.infer('generate-welcome-intro', {
            model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
            body: {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt }
                        ]
                    }]
            }
        })

        await step.run('send-welcome-email', async () => {
            const part = response.candidates?.[0]?.content?.parts?.[0];
            const introText = (part && 'text' in part ? part.text : null) ||'Thanks for joining Signalist. You now have the tools to track markets and make smarter moves.'

            const { data: { email, name } } = event;

            return await sendWelcomeEmail({ email, name, intro: introText });
        })

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
)

export const sendDailyNewsSummary = inngest.createFunction(
    { id: 'daily-news-summary' },
    [ {event: 'app/send.daily.news'}, { cron: '0 12 * * *'} ],
     async ({ step }) => {
        // Step 1: Get all users for news delivery
        const users = await step.run('get-all-users', getAllUsersForNewsEmail)

        if(!users || users.length === 0) return { success: true, message: 'No users found' }

        // Step 2: For each user, gather their news (watchlist-based or general fallback)
        const perUserNews = await step.run('fetch-user-news', async () => {
            const results: { email: string; name: string; news: MarketNewsArticle[] }[] = [];

            for (const u of users) {
                const symbols = await getWatchlistSymbolsByEmail(u.email);
                let news: MarketNewsArticle[] = [];
                if (symbols && symbols.length > 0) {
                    try {
                        news = await getNews(symbols);
                    } catch {
                        news = [];
                    }
                }
                if (!news || news.length === 0) {
                    try {
                        news = await getNews();
                    } catch {
                        news = [];
                    }
                }

                // Ensure max 6 articles per user
                news = (news || []).slice(0, 6);

                results.push({ email: u.email, name: u.name, news });
            }

            return results;
        })

        // Step 3: Placeholder - Summarize news via AI (not implemented)
        const userNewsSummaries: { user: User; newsContent: string | null}[] = []
        for (const {userm, news} of results)

        // Step 4: Placeholder - Send the emails (not implemented)
        await step.run('send-news-emails', async () => {
            // Placeholder: integrate with email service to dispatch summaries
            return true;
        })

        return { success: true }
     }
)
