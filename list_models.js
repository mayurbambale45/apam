require('dotenv').config();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

groq.models.list().then(r => {
    const all = r.data.map(m => m.id);
    console.log('ALL MODELS:\n' + all.join('\n'));
    process.exit(0);
}).catch(e => {
    console.error('ERROR:', e.message);
    process.exit(1);
});
