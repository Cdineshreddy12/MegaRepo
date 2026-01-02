import Redis from 'ioredis';

async function setupVectors() {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  // Generate sample 1536-dimensional vectors
  function generateVector(seed, scale = 0.1) {
    const vec = [];
    for (let i = 0; i < 1536; i++) {
      // Simple deterministic pattern for demo
      const value = Math.sin(seed + i * 0.1) * scale;
      vec.push(value);
    }
    // Normalize
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    return vec.map(v => v / norm);
  }

  // Convert to Float32Array buffer for Redis
  function vecToBuffer(vec) {
    const buffer = Buffer.allocUnsafe(1536 * 4);
    const float32 = new Float32Array(buffer.buffer);
    for (let i = 0; i < 1536; i++) {
      float32[i] = vec[i];
    }
    return buffer;
  }

  const vec1 = generateVector(1, 0.1);
  const vec2 = generateVector(2, 0.1);
  const vec3 = generateVector(3, 0.1);

  // Store documents with proper 1536-dim vectors
  await client.hset('doc:1', {
    'embedding': vecToBuffer(vec1),
    'text': 'This is a sample document about machine learning and artificial intelligence',
    'title': 'Introduction to Machine Learning'
  });

  await client.hset('doc:2', {
    'embedding': vecToBuffer(vec2),
    'text': 'Deep learning and neural networks for advanced AI applications',
    'title': 'Deep Learning Guide'
  });

  await client.hset('doc:3', {
    'embedding': vecToBuffer(vec3),
    'text': 'Natural Language Processing fundamentals and transformer models',
    'title': 'NLP Fundamentals'
  });

  console.log('✅ Stored 3 documents with 1536-dimensional embeddings');
  console.log('Vector 1 length:', vec1.length);
  console.log('Vector 2 length:', vec2.length);
  console.log('Vector 3 length:', vec3.length);

  // Verify
  const doc1Fields = await client.hkeys('doc:1');
  console.log('doc:1 fields:', doc1Fields);

  await client.quit();
}

setupVectors().catch(console.error);



