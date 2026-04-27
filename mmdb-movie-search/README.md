# MongoDB Movie Database (MMDB) - Atlas Search Demo

A hands-on demonstration environment for MongoDB Atlas Search. This modern web application demonstrates how to build powerful search capabilities using MongoDB Atlas Search with the `sample_mflix` database.

## About the Demo

In this presentation, you will progressively showcase the power of MongoDB Atlas Search by seamlessly uncommenting pre-written code in the `server.js` backend.

You will demonstrate 13 distinct features in sequence:
1. **Exact match** - Standard MongoDB query baseline
2. **Simple full text search** - The base `text` operator
3. **Fuzzy search** - Handling typos with `prefixLength` and `maxExpansions`
4. **Match criteria** - Enforcing `matchCriteria: "all"`
5. **Compound Search** - The `should` array for scoring logic
6. **Range and Equals** - Hard filtering results
7. **Search scores** - Exposing relevance scoring
8. **Boost search scores** - Modifying rankings dynamically (path, value, constant)
9. **Modify sort order** - Sorting by fields instead of relevance
10. **Auto complete** - Type-ahead suggestions
11. **Highlighting** - Showing exact search matches in the text
12. **Synonyms** - Mapping related terms
13. **Faceting** - Aggregated bucket counts for a storefront experience

The application consists of:
- **Backend** (`server.js`) - Node.js/Express server with MongoDB Atlas Search aggregations
- **Frontend** (`index.html`) - Interactive UI with search, autocomplete, and results display
- **Configuration** (`.env`) - MongoDB connection and search index settings

---

## Prerequisites

Before starting the demo, ensure you have completed the following setup:

### 1. MongoDB Atlas Cluster & Data
- ✅ Have an active MongoDB Atlas cluster (free tier M0 works fine)
- ✅ Load the `sample_mflix` dataset (specifically the `movies` collection)
- ✅ Create a database user with the role `atlasAdmin@admin`
- ✅ Add your IP address to the Network Access IP Access List
- ✅ Create a synonyms collection named `sample_synonyms` inside `sample_mflix` and insert your mappings.

### 2. Configure the Unified Search Index
To ensure all 13 steps run flawlessly without syntax or analyzer errors, you must create a single comprehensive Search Index using the JSON Editor.

1. In the Atlas UI, go to **Search & Vector Search** → **Create Search Index**
2. Choose **Atlas Search** and **JSON Editor**
3. Select Database: `sample_mflix` and Collection: `movies`
4. Name the index `movie_search`
5. Paste the following JSON:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "cast": {
        "store": false,
        "type": "string"
      },
      "fullplot": {
        "analyzer": "lucene.english",
        "searchAnalyzer": "lucene.english",
        "store": true,
        "type": "string"
      },
      "genres": {
        "type": "token"
      },
      "imdb": {
        "fields": {
          "rating": {
            "type": "number"
          }
        },
        "type": "document"
      },
      "released": {
        "type": "date"
      },
      "title": [
        {
          "store": false,
          "type": "string"
        },
        {
          "type": "autocomplete"
        }
      ],
      "year": {
        "type": "number"
      }
    }
  },
  "synonyms": [
    {
      "analyzer": "lucene.english",
      "name": "my_synonyms",
      "source": {
        "collection": "sample_synonyms"
      }
    }
  ]
}
```
*Note: `store: true` on `fullplot` is required for highlighting. The `my_synonyms` analyzer MUST match the `fullplot` analyzer.*

### 3. Start the Application
Clone the repository, run `npm install`, add your `MONGODB_URI` to the `.env` file, and start the app:
```bash
npm install
npm run dev
```

---

## The Step-by-Step Presentation Script

Your `server.js` file is meticulously structured to map exactly to the demonstration flow. Because you are using `nodemon`, the backend will automatically restart when you save `server.js`, allowing you to seamlessly refresh the UI and show the new feature without breaking your flow.

### Step 1: Exact Match
*   **Where:** `exactMatchSearch` function
*   **Action:** In the UI, use Exact Match. Search `mission` (returns nothing), then `Mission: Impossible` (returns match). Point out standard MongoDB syntax in the code.

### Step 2: Simple Full Text Search
*   **Where:** `fullTextSearch` function
*   **Action:** Switch UI to "Full Text Search". Uncomment the main `let cursor = ...` block (including the `text` operator under `must`).
*   **Demo:** Search `mission`. It works!

### Step 3: Fuzzy Search
*   **Where:** Inside the `text` operator in `fullTextSearch`.
*   **Action:** Uncomment the `fuzzy` block.
*   **Demo:** Search `missin` (typo). It still finds the movie. Explain `prefixLength` and `maxExpansions`.

### Step 4: Match Criteria
*   **Where:** Inside the `text` operator in `fullTextSearch`.
*   **Action:** Uncomment `"matchCriteria": "all"`.
*   **Demo:** Search `Mission Impossible` and show how it strictly requires all tokens.

### Step 5: Compound Search
*   **Where:** The `should` block under `compound` in `fullTextSearch`.
*   **Action:** Explain that `compound` logic allows combining operators.

### Step 6: Range & Equals
*   **Where:** The `filter` block under `compound` in `fullTextSearch`.
*   **Action:** Uncomment the `filter` array and the `range`/`equals` objects.
*   **Demo:** Notice how older movies and non-Action movies drop out of the search results immediately.

### Step 7: Search Scores
*   **Where:** The `$project` stage at the very bottom of `fullTextSearch`.
*   **Action:** Uncomment `, score: { $meta: "searchScore" }`
*   **Demo:** The UI will now display the relevance score next to each movie title!

### Step 8: Boost Search Scores
*   **Where:** The `should` array block in `fullTextSearch`.
*   **Action:** Uncomment the `should` array, the `text` operator inside it, and one of the `boost` lines.
*   **Demo:** If a query hits the `title`, its score is artificially multiplied based on IMDb rating or a constant, pushing it higher in the results.

### Step 9: Modify Sort Order
*   **Where:** At the bottom of the `$search` stage in `fullTextSearch`.
*   **Action:** Uncomment `, "sort": { "year": -1 }`.
*   **Demo:** Search scores are overridden, and results are now forced into descending chronological order.

### Step 10: Auto Complete
*   **Where:** `autocompleteTitle` function
*   **Action:** Uncomment the `$search` block using the `autocomplete` operator.
*   **Demo:** Start typing in the search bar. Suggestions instantly appear.

### Step 11: Highlighting
*   **Where:** `fullTextSearch` function.
*   **Action:** Uncomment `"highlight": { "path": "fullplot" }` in the `$search` stage, AND uncomment `highlights: { $meta: "searchHighlights" }` in the `$project` stage.
*   **Demo:** Click on a movie result to open the modal. The matched search terms in the plot will be highlighted in yellow.

### Step 12: Synonyms
*   **Where:** The `should` array block in `fullTextSearch`.
*   **Action:** Uncomment `, "synonyms": "my_synonyms"`.
*   **Demo:** Search for a mapped synonym (e.g., if configured, search 'car' to find 'automobile').

### Step 13: Faceting
*   **Where:** `searchFacets` function
*   **Action:** Ensure the `$searchMeta` pipeline is active.
*   **Demo:** The sidebar instantly populates with categorized buckets (Genres, Ratings) giving users an Amazon-like shopping experience.

---

## Troubleshooting

### Server Won't Start
- Check that `MONGODB_URI` in `.env` is correct.
- Verify network access in Atlas (IP allowlist).

### API 500 Error on Synonyms
- Ensure the field you are searching inside the `should` block (e.g., `fullplot`) has an analyzer (`lucene.english`) that exactly matches the analyzer assigned to `my_synonyms` in the index JSON.

**Happy Searching! 🎬🔍**
