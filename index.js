require('dotenv').config(); // Load environment variables
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// OpenAI API client initialization
const openai = new OpenAIApi(new Configuration({
    apiKey: openaiApiKey,
}));

// Initialize Express
const app = express();
app.use(express.json());

// Middleware for API key verification
function verifyApiKey(req, res, next) {
    const apiKey = req.get('X-API-KEY');
    console.log('Verifying API Key');
    if (apiKey && apiKey === process.env.MY_API_KEY) {
        next();
    } else {
        console.log('Invalid API Key');
        res.status(401).send('Invalid API Key');
    }
}

// Endpoint to receive input and process it
app.get('/search', verifyApiKey, async (req, res) => {
    try {
        // Retrieve the search term and optional filter from query parameters
        const inputQuery = req.query.query; // 'query' is the name of the query parameter
        const filter = req.query.filter ? JSON.parse(req.query.filter) : '{}'; // Optional filter parameter

        if (!inputQuery) {
            return res.status(400).send('Query parameter is required');
        }

        // Generate embeddings for the input query
        const embeddingResponse = await openai.createEmbedding({
            model: "text-embedding-ada-002",
            input: inputQuery,
        });

        const queryEmbedding = embeddingResponse.data.data[0].embedding;

        // Query the Supabase function to find similar documents
        const matchCount = 7; // Number of results to return

        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_count: matchCount,
            filter: filter, // Passing the filter parameter to the stored procedure
        });

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
