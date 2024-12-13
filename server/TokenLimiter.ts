type TokensUsedPerMinute = { [key: string]: number };

//
// Experimental
//

export class TokenRateLimiter {
    public MEM_USED: NodeJS.MemoryUsage;

    private readonly limits: Record<string, { lastInteractionTime: number, totalTokens: number }>;
    private readonly tokensUsedPerMinute: { [key: string]: TokensUsedPerMinute };

    constructor(private readonly rateLimits: { [key: string]: number }) {
        this.MEM_USED = process.memoryUsage();
        
        this.limits = {};
        this.tokensUsedPerMinute = {};
        Object.entries(rateLimits).forEach(([key, value]) => {
            this.limits[key] = { lastInteractionTime: 0, totalTokens: 0 };
            this.tokensUsedPerMinute[`${key}: ${Math.floor(new Date().getTime() / 60000)}`] = { [key]: 0 }; // Initialize with default value 0
        });
    }

    public async submit(id: string, tokens: number): Promise<void> {
        const { lastInteractionTime, totalTokens } = this.limits[id];
        const now = performance.now();
        if (now - lastInteractionTime < 60000) {
            // Check if the difference between the current time and the last interaction time is less than 1 minute
            const remainingTokens = this.rateLimits[id] - Math.floor((now - lastInteractionTime) / 1000);
            if (totalTokens + tokens > remainingTokens) {
                // If the tokens are close to the limit, wait for 1 minute before submitting again
                const delay = Math.max(0, 60000 - (now - lastInteractionTime));
                if (delay > 1000) { // only log if waiting time > 1 second
                    console.warn(`Waiting ${delay / 1000} seconds before continuing...`);
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        this.limits[id] = { lastInteractionTime: now, totalTokens: totalTokens + tokens };

        // Update the tokens used per minute
        const minuteKey = `${id}: ${Math.floor(now / 60000)}`;
        if (!this.tokensUsedPerMinute[minuteKey]) {
            this.tokensUsedPerMinute[minuteKey] = { [id]: 0 }; // Initialize with id as property and value 0
        }
        this.tokensUsedPerMinute[minuteKey][id] += tokens;
    }

    public printTokensUsedPerMinute(): void {
        console.log('Tokens used per minute:');
        Object.keys(this.tokensUsedPerMinute).forEach(key => {
            const [id, minute ] = key.split(':');
            console.log(`  ${minute}: ${id} - ${JSON.stringify((this.tokensUsedPerMinute[key] ?? {})[id], null, 2)} tokens`);
        });
    }
}
