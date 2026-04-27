// server.js - MongoDB Movie Database Backend Server
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration from .env
const CONFIG = {
    mongodbUri: process.env.MONGODB_URI,
    database: process.env.DATABASE_NAME || 'sample_mflix',
    collectionName: process.env.COLLECTION_NAME || 'movies',
    searchIndexName: process.env.SEARCH_INDEX_NAME || 'default',
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
};

let mongoClient;
let moviesCollection;

// ============================================
// DATABASE CONNECTION
// ============================================

async function connectToDatabase() {
    try {
        mongoClient = new MongoClient(CONFIG.mongodbUri);
        await mongoClient.connect();
        const db = mongoClient.db(CONFIG.database);
        moviesCollection = db.collection(CONFIG.collectionName);
        console.log('✓ Connected to MongoDB Atlas');
        console.log(`✓ Database: ${CONFIG.database}`);
        console.log(`✓ Collection: ${CONFIG.collectionName}`);
    } catch (error) {
        console.error('✗ MongoDB connection error:', error.message);
        process.exit(1);
    }
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

/**
 * Exact Match Search
 * Searches for exact matches in the specified field
 * @param {string} query - Search query
 * @param {string} field - Field to search (title, cast, plot)
 * @param {string} sort - Sort option (year, rating, or empty)
 * @returns {Promise<Array>} Array of matching movies
 */
async function exactMatchSearch(query, field, sort) {
    try {
        // --- DEMO STEP 1: Exact Match ---
        // This uses standard MongoDB syntax: { "title": "The Matrix" }
        // It is case-sensitive and rigid.
        const searchQuery = { [field]: query };

        const sortQuery = { [sort]: -1 };

        let cursor;

        if (sort && sort !== '') {
            cursor = moviesCollection.find(searchQuery).sort(sortQuery);
        } else {
            cursor = moviesCollection.find(searchQuery);
        }

        const results = await cursor.toArray();
        console.log(`✓ Exact match search: "${query}" in field "${field}" - Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('✗ Exact match search error:', error);
        throw error;
    }
}

/**
 * Full Text Search using MongoDB Atlas Search
 * Performs text search across movie titles, plots, and full plots with scoring.
 * 
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching movies with relevance scores
 */
async function fullTextSearch(query) {
    try {
        // --- DEMO STEPS FOR ATLAS SEARCH ---
        // Uncomment the let cursor = ... block below to run the demo steps

        let cursor = moviesCollection.aggregate([
            {
                "$search": {
                    "index": CONFIG.searchIndexName,

                    "compound": {
                        "must": [
                            // --- DEMO STEP 2: Simple Full Text Search ---
                            {
                                "text": {
                                    "path": ["title", "cast", "fullplot"],
                                    "query": query

                                    // --- DEMO STEP 3: Fuzzy ---
                                    // Uncomment below to allow 1 character typo
                                    // , "fuzzy": { "maxEdits": 1, "prefixLength": 2, "maxExpansions": 50 }

                                    // --- DEMO STEP 4: Match Criteria ---
                                    // Uncomment below to implement matchCriteria
                                    , "matchCriteria": "all"
                                }
                            }
                        ]
                        // --- DEMO STEP 6: Range and Equals ---
                        // Uncomment the 'filter' block below

                        , "filter": [
                            // --- DEMO: Range ---
                            { "range": { "path": "year", "gt": 2000 } }
                            // --- DEMO: Equals ---
                            // Uncomment below
                            , { "equals": { "path": "genres", "value": "Action" } }
                        ]

                        // --- DEMO STEP 5: Compound Search ---
                        // Uncomment the 'should' block below

                        , "should": [
                            {
                                "text": {
                                    "path": "fullplot",
                                    "query": query
                                    // --- DEMO STEP 8: Boost Search Scores ---
                                    // Uncomment each line below to boost movies matching this clause
                                    , "score": { "boost": { "path": "imdb.rating", "undefined": 5 } }
                                    // , "score": { "boost": { "value": 5 } }
                                    // , "score": { "constant": { "value": 5 } }

                                    // --- DEMO STEP 12: Synonyms ---
                                    // Uncomment below to map words like 'car' to 'automobile'
                                    // , "synonyms": "my_synonyms"
                                }
                            }
                        ]
                        // Uncomment below to implement minimumShouldMatch
                        , "minimumShouldMatch": 1

                    }

                    // --- DEMO STEP 11: Highlighting (Search) ---
                    // Uncomment below
                    , "highlight": { "path": "fullplot" }

                    // --- DEMO STEP 9: Modify Sort Order ---
                    // Uncomment below
                    // , "sort": { "year": -1 }
                }
            },
            // --- DEMO STEP 7: Search Scores ---
            // We can project the score using $meta.
            {
                $project: {
                    title: 1, year: 1, cast: 1, fullplot: 1, poster: 1, genres: 1, imdb: 1, released: 1, runtime: 1, rated: 1
                    // Uncomment below to add search score
                    , score: { $meta: "searchScore" }

                    // --- DEMO STEP 11: Highlighting (Project) ---
                    // Uncomment below
                    , highlights: { $meta: "searchHighlights" }
                }
            }
        ]);

        const results = await cursor.toArray();
        console.log(`ℹ Full text search: "${query}" - Found ${results.length} results`);
        return results;

        return [];
    } catch (error) {
        console.error('✗ Full text search error:', error);
        throw error;
    }
}

/**
 * Performs autocomplete search for movie titles using MongoDB Atlas Search.
 * 
 * @param {string} query - The search query string to autocomplete
 * @returns {Promise<Array>} Array of matching movie documents with title field
 * @throws {Error} Throws an error if the autocomplete search operation fails
 * 
 * @example
 * const results = await autocompleteTitle("The God");
 * // Returns: [{ _id: ..., title: "The Godfather" }, ...]
 */
async function autocompleteTitle(query) {
    try {
        // --- DEMO STEP 10: Auto Complete ---
        // Uncomment the code below to enable Autocomplete

        let cursor = moviesCollection.aggregate([
            {
                $search: {
                    "index": CONFIG.searchIndexName,
                    "autocomplete": { "query": query, "path": "title" }
                }
            },
            { $project: { title: 1 } },
            { $limit: 8 }
        ]);
        const results = await cursor.toArray();

        console.log(`ℹ Autocomplete search: "${query}" - Found ${results.length} results`);
        return results;
        // Uncomment till here
        return [];
    } catch (error) {
        console.error('✗ Autocomplete search error:', error);
        throw error;
    }
}

/**
 * Performs faceted search to get aggregated counts by genres, ratings, and release dates.
 * Uses MongoDB Atlas Search $searchMeta to generate facets without returning documents.
 * 
 * @param {string} query - The search query string
 * @returns {Promise<Array>} Array containing facet results with buckets for genres, ratings, and release dates
 * 
 * @example
 * const facets = await searchFacets("action");
 * // Returns: [{ facet: { genres: { buckets: [...] }, ratings: { buckets: [...] }, release_dates: { buckets: [...] } } }]
 */
async function searchFacets(query) {
    try {
        // --- DEMO STEP 13: Faceting ---
        // Uncomment the code below to enable Facets using $searchMeta

        const cursor = moviesCollection.aggregate([
            {
                "$searchMeta": {
                    "index": CONFIG.searchIndexName,
                    "facet": {
                        "operator": {
                            "compound": {
                                "must": [
                                    { "text": { "path": ["title", "cast"], "query": query } },
                                    { "range": { "path": "year", "gt": 2000 } }
                                ]
                            }
                        },
                        "facets": {
                            "genres": {
                                "type": "string",
                                "path": "genres",
                                "numBuckets": 3
                            },
                            "ratings": {
                                "type": "number",
                                "path": "imdb.rating",
                                "boundaries": [0, 5, 8, 10]
                            },
                            "release_dates": {
                                "type": "date",
                                "path": "released",
                                "boundaries": [
                                    new Date("2000-01-01"),
                                    new Date("2005-01-01"),
                                    new Date("2015-01-01"),
                                    new Date("2020-01-01")
                                ],
                                "default": "older"
                            }
                        }
                    }
                }
            }
        ]);

        let results;
        try {
            results = await cursor.toArray();
        } catch (e) {
            results = [];
        }

        console.log(`ℹ Facet search: "${query}" - Found ${results.length} results`);
        return results;
        // Uncomment till here

        return [];
    } catch (error) {
        console.error('✗ Facet search error:', error);
        throw error;
    }
}


// ============================================
// API ENDPOINTS
// ============================================

/**
 * POST /api/search/exact
 * Exact match search endpoint
 * 
 * Request body:
 * {
 *   "query": "string",
 *   "field": "title|cast|plot",
 *   "sort": ""|"year"|"rating"
 * }
 */
app.post('/api/search/exact', async (req, res) => {
    try {
        const { query, field, sort } = req.body;

        if (!query || !field) {
            return res.status(400).json({
                error: 'Query and field are required',
                example: { query: 'The Matrix', field: 'title', sort: 'year' }
            });
        }

        const results = await exactMatchSearch(query, field, sort || '');
        res.json(results);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/suggestions
 * Get autocomplete suggestions for full text search
 */
app.post('/api/suggestions', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query || query.length < 2) {
            return res.status(400).json({
                error: 'Query must be at least 2 characters'
            });
        }

        const results = await autocompleteTitle(query);

        // Extract just the titles
        const suggestions = results.map(doc => doc.title);

        console.log(`✓ Autocomplete suggestions: "${query}" - Found ${suggestions.length} suggestions`);
        res.json(suggestions);
    } catch (error) {
        console.error('✗ Suggestions error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/search/fulltext
 * Full text search endpoint
 * 
 * Request body:
 * {
 *   "query": "string"
 * }
 */
app.post('/api/search/fulltext', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                error: 'Query is required',
                example: { query: 'action adventure' }
            });
        }

        const results = await fullTextSearch(query);
        res.json(results);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/search/facets
 * Get faceted search results for genres, ratings, and release dates
 * 
 * Request body:
 * {
 *   "query": "string"
 * }
 */
app.post('/api/search/facets', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({
                error: 'Query is required',
                example: { query: 'action' }
            });
        }

        const results = await searchFacets(query);
        res.json(results);
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'Server is running',
        timestamp: new Date(),
        config: {
            database: CONFIG.database,
            collection: CONFIG.collectionName
        }
    });
});

/**
 * GET /
 * Serve static files (optional - for testing)
 */
app.get('/', (req, res) => {
    res.send('MongoDB Movie Database API is running. Open index.html in your browser.');
});

// ============================================
// START SERVER
// ============================================

const PORT = CONFIG.port || 3000;
const HOST = CONFIG.host || 'localhost';

connectToDatabase().then(() => {
    app.listen(PORT, HOST, () => {
        console.log('');
        console.log('╔════════════════════════════════════════╗');
        console.log('║  MongoDB Movie Database API Started    ║');
        console.log('╚════════════════════════════════════════╝');
        console.log('');
        console.log(`Server running at http://${HOST}:${PORT}`);
        console.log(`Health check: http://${HOST}:${PORT}/api/health`);
        console.log('');
        console.log('Open index.html in your browser to use the application.');
        console.log('');
    });
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGINT', async () => {
    console.log('\n⏹ Shutting down gracefully...');
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});

