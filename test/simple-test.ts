import { WorkersSystem } from '../server/workers';
import { BotChatMessage } from '../server/bot.types';
import { Reset, Blue, Green, Red, Yellow, Magenta, Cyan, Gray } from '../server/lib/colors';

// Simple mock EventBus that doesn't log anything
class SilentEventBus {
    publish() {} // Silent - no console output
    subscribe() {}
}

async function testSingleQuery() {
    console.log(`${Cyan}🧪 Testing Workers Graph with Single Query${Reset}\n`);

    // Create worker system with silent event bus
    const eventBus = new SilentEventBus();
    const workersSystem = new WorkersSystem(eventBus as any, 12345);

    // Test message
    const userMessage: BotChatMessage = {
        name: "TestUser",
        message: "Create a simple space with a welcome message about Nouns DAO",
        clientId: 12345,
        type: "user_message",
        spaceContext: "{}" 
    };

    console.log(`${Gray}Query: "${userMessage.message}"${Reset}\n`);
    console.log(`${Blue}🚀 Starting agents workflow...${Reset}\n`);

    try {
        const startTime = Date.now();
        const result = await workersSystem.invokeWorkers(userMessage, "");
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`${Green}✅ Workflow completed successfully!${Reset}\n`);
        console.log(`${Gray}⏱️  Total time: ${duration.toFixed(2)}s${Reset}\n`);

        // Display results
        const res = result as any;
        
        if (res.plannerOutput) {
            console.log(`${Blue}📋 PLANNER OUTPUT:${Reset}`);
            console.log(`${Blue}${"-".repeat(50)}${Reset}`);
            console.log(`${Gray}${res.plannerOutput}${Reset}`);
            console.log("\n");
        }

        if (res.designerOutput) {
            console.log(`${Magenta}🎨 DESIGNER OUTPUT:${Reset}`);
            console.log(`${Magenta}${"-".repeat(50)}${Reset}`);
            console.log(`${Gray}${res.designerOutput}${Reset}`);
            console.log("\n");
        }

        if (res.builderOutput) {
            console.log(`${Yellow}🔧 BUILDER OUTPUT (JSON):${Reset}`);
            console.log(`${Yellow}${"-".repeat(50)}${Reset}`);
            try {
                const json = JSON.parse(res.builderOutput);
                console.log(`${Gray}${JSON.stringify(json, null, 2)}${Reset}`);
            } catch (e) {
                console.log(`${Red}Invalid JSON: ${res.builderOutput}${Reset}`);
            }
            console.log("\n");
        }

        if (res.communicatorOutput) {
            console.log(`${Cyan}💬 COMMUNICATOR OUTPUT:${Reset}`);
            console.log(`${Cyan}${"-".repeat(50)}${Reset}`);
            console.log(`${Gray}${res.communicatorOutput}${Reset}`);
            console.log("\n");
        }

    } catch (error) {
        console.error(`${Red}❌ Error: ${error}${Reset}`);
    }
}

// Run the test
testSingleQuery().catch(console.error);
