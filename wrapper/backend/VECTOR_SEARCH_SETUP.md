# Vector Search Setup for Embeddings

## ✅ Setup Complete!

Vector search has been successfully set up in your Redis instance with RedisSearch module.

## What Was Done

1. **Installed Redis Stack** - Includes RedisSearch module for vector similarity search
2. **Created Vector Index** - `embeddings_index` configured for 1536-dimensional embeddings
3. **Stored Sample Documents** - 3 documents with proper 1536-dim vectors stored

## Index Configuration

- **Index Name**: `embeddings_index`
- **Vector Field**: `embedding`
- **Dimensions**: 1536 (compatible with OpenAI embeddings)
- **Distance Metric**: COSINE
- **Algorithm**: HNSW (Hierarchical Navigable Small World)
- **Prefix**: `doc:` (documents stored as `doc:1`, `doc:2`, etc.)

## Current Documents

1. **doc:1** - "Introduction to Machine Learning"
2. **doc:2** - "Deep Learning Guide"  
3. **doc:3** - "NLP Fundamentals"

All documents have:
- `embedding`: 1536-dimensional vector (Float32)
- `title`: Document title
- `text`: Document content

## How to Use Vector Search

### Using Redis MCP Tool

```javascript
// Generate a 1536-dim query vector (e.g., from OpenAI embeddings API)
const queryVector = [/* 1536 float values */];

// Use the MCP tool
mcp_redis-mcp_vector_search_hash({
  query_vector: queryVector,
  index_name: "embeddings_index",
  k: 3,  // Number of results
  return_fields: ["title", "text"]
})
```

### Using Node.js/ioredis

```javascript
import Redis from 'ioredis';

const client = new Redis('redis://localhost:6379');

async function searchSimilar(queryVector) {
  // Convert vector to Float32Array buffer
  const vecBuffer = Buffer.from(new Float32Array(queryVector).buffer);
  
  // Perform vector search
  const results = await client.call(
    'FT.SEARCH',
    'embeddings_index',
    '*=>[KNN 3 @embedding $vec_param]',
    'RETURN', '3', 'title', 'text',
    'DIALECT', '2',
    'LIMIT', '0', '3',
    'PARAMS', '2', 'vec_param', vecBuffer
  );
  
  return results;
}
```

### Using Redis CLI

```bash
# First, create a binary file with your query vector
# Then use FT.SEARCH with PARAMS
redis-cli FT.SEARCH embeddings_index '*=>[KNN 3 @embedding $vec_param]' \
  RETURN 3 title text \
  DIALECT 2 \
  LIMIT 0 3 \
  PARAMS 2 vec_param <query_vector.bin
```

## Adding New Documents

Use the setup script or manually:

```javascript
import Redis from 'ioredis';

const client = new Redis('redis://localhost:6379');

async function addDocument(docId, embedding, title, text) {
  // Convert embedding array to buffer
  const vecBuffer = Buffer.from(new Float32Array(embedding).buffer);
  
  await client.hset(`doc:${docId}`, {
    'embedding': vecBuffer,
    'title': title,
    'text': text
  });
}

// Example: Add a new document
await addDocument(
  4,
  [/* 1536-dim embedding from your model */],
  'Document Title',
  'Document content...'
);
```

## Getting Embeddings

For production use, generate embeddings using:
- **OpenAI**: `text-embedding-3-large` (3072 dims) or `text-embedding-3-small` (1536 dims)
- **OpenAI**: `text-embedding-ada-002` (1536 dims)
- **Other models**: Cohere, Hugging Face, etc.

## Index Status

Check index status:
```bash
redis-cli FT.INFO embeddings_index
```

Or using MCP:
```javascript
mcp_redis-mcp_get_index_info({ index_name: "embeddings_index" })
```

## Next Steps

1. **Generate Real Embeddings**: Use an embedding model to convert your text documents to vectors
2. **Bulk Import**: Create a script to import your document corpus
3. **Build Search API**: Create an API endpoint that accepts text queries, generates embeddings, and returns similar documents
4. **Hybrid Search**: Combine vector search with keyword search for better results

## Files Created

- `setup-vector-embeddings.js` - Script to store sample documents with embeddings
- This documentation file

## Troubleshooting

If vector search doesn't work:
1. Verify Redis Stack is running: `redis-cli ping`
2. Check modules are loaded: `redis-cli MODULE LIST`
3. Verify index exists: `redis-cli FT._LIST`
4. Check document format: `redis-cli HGETALL doc:1`

## Resources

- [RedisSearch Vector Search Docs](https://redis.io/docs/interact/search-and-query/advanced-concepts/vectors/)
- [Redis Stack Documentation](https://redis.io/docs/stack/)



