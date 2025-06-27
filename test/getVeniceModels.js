// const { ChatOpenAI } = require("@langchain/openai"); // Replace 'library-name' with the actual library
// getVeniceModels-native.js
const https = require('https');
// const ChatOpenAI = require();
const OpenAI = require("openai");
const dotenv = require("dotenv");
dotenv.config();

// const client = new OpenAI();

https.get('https://api.venice.ai/api/v1/models', (res) => {
    let data = '';

    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
        const jsonResponse = JSON.parse(data); // Parse the JSON response
        const modelList = jsonResponse.data; // Get the array of models

        for (const model of modelList) {
            try {
                const createdDate = new Date(model.created * 1000).toLocaleString();
                console.log(`Testing model: ${model.id}, Created: ${createdDate}`);

                // const jsonModel = new OpenAI({
                //     apiKey: process.env.VENICE_API_KEY,
                //     baseURL: process.env.VENICE_BASE_URL
                // });

                // const modelResult = await jsonModel.chat.completions.create({
                //     model: model.id,
                //     temperature: 0,
                //     messages: [
                //         {
                //             role: "system",
                //             content: "You are a Json file writer",
                //         },
                //         {
                //             role: "user",
                //             content: "write a simple json example.",
                //         },
                //     ],
                //     // @ts-expect-error Venice.ai paramters are unique to Venice.
                //     venice_parameters: {
                //         include_venice_system_prompt: false,
                //     },
                // });
                // console.log(modelResult.choices[0].message.content); // Log the result for each model            } catch (e) {
            } catch (e) {
                // const modelResult = await jsonModel.invoke("create a json file example for music industry");
                console.error('JSON parse error:', e.error, e.lc_error_code);
            }
        }

    });
}).on('error', (err) => {
    console.error('Request error:', err);
});
