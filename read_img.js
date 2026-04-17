require('dotenv').config();
const fs = require('fs');
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const model = 'meta-llama/llama-4-scout-17b-16e-instruct';

async function main() {
    const dir = 'C:\\Users\\mayur\\.gemini\\antigravity\\brain\\e40538e8-5e55-4f6f-8398-f95647b6d05d';
    const files = ['media__1776328421289.png', 'media__1776328042404.png', 'grievances_db_error_1776327602057.png'];
    
    for (const f of files) {
        const fullPath = dir + '\\' + f;
        if (!fs.existsSync(fullPath)) continue;
        console.log("Reading:", fullPath);
        const b64 = fs.readFileSync(fullPath).toString('base64');
        const imageUrl = `data:image/png;base64,${b64}`;
        try {
            const resp = await groq.chat.completions.create({
                model,
                messages: [{role:'user', content:[{type:'text',text:'Read all error messages visible in this image carefully and print them exactly. Detail which UI element or code block the error belongs to. Is it frontend or backend?'},{type:'image_url', image_url:{url:imageUrl}}]}]
            });
            console.log("---- Result ----\n", resp.choices[0].message.content, "\n------------------\n");
        } catch(e) {
            console.error("error with", f, e.message);
        }
    }
}
main();
