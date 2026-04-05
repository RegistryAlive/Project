/**
 * Cloudflare Worker for Recipe Ratings
 * 
 * Setup Instructions:
 * 1. Create a KV Namespace in Cloudflare Dashboard called `RECIPE_RATINGS`
 * 2. Bind it to this Worker with binding name `RECIPE_RATINGS`
 * 3. Deploy this Worker and note the URL
 * 4. Update `RATINGS_API_URL` in Item.html with your Worker URL
 * 
 * wrangler.toml:
 * [[kv_namespaces]]
 * binding = "RECIPE_RATINGS"
 * id = "your-kv-namespace-id"
 */

// Simple rate limiting: track IPs that have rated recently
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const MAX_RATINGS_PER_WINDOW = 10; // max ratings per IP per window

export default {
  async fetch(request, env) {
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new CORSResponse(null);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'get') {
      return handleGetRating(url, env, request);
    } else if (action === 'submit' && request.method === 'POST') {
      return handleSubmitRating(request, env);
    } else if (action === 'batch' && request.method === 'POST') {
      return handleBatchGet(request, env);
    }

    return new CORSResponse(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400 }
    );
  }
};

/**
 * GET rating for a recipe
 * GET /?action=get&recipe=base64encoded
 */
async function handleGetRating(url, env, request) {
  const recipeId = url.searchParams.get('recipe');
  if (!recipeId) {
    return new CORSResponse(
      JSON.stringify({ error: 'Missing recipe parameter' }),
      { status: 400 }
    );
  }

  const data = await env.RECIPE_RATINGS.get(`rating:${recipeId}`, 'json');
  
  if (!data) {
    return new CORSResponse(JSON.stringify({
      recipeId,
      average: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }));
  }

  return new CORSResponse(JSON.stringify({
    recipeId,
    average: data.average || 0,
    count: data.count || 0,
    distribution: data.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  }));
}

/**
 * POST rating for a recipe
 * POST /?action=submit&recipe=base64encoded
 * Body: { "score": 1-5 }
 */
async function handleSubmitRating(request, env) {
  const url = new URL(request.url);
  const recipeId = url.searchParams.get('recipe');
  
  if (!recipeId) {
    return new CORSResponse(
      JSON.stringify({ error: 'Missing recipe parameter' }),
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new CORSResponse(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400 }
    );
  }

  const score = parseInt(body.score);
  if (!score || score < 1 || score > 5) {
    return new CORSResponse(
      JSON.stringify({ error: 'Score must be between 1 and 5' }),
      { status: 400 }
    );
  }

  // Simple rate limiting using IP
  // Note: In production, consider using Cloudflare's built-in rate limiting
  const clientIP = request.headers.get('CF-Connecting-IP') || 
                   request.headers.get('X-Forwarded-For') || 
                   'unknown';

  // Check rate limit (optional, can be disabled if not needed)
  // const rateLimitKey = `ratelimit:${clientIP}`;
  // const rateLimitData = await env.RECIPE_RATINGS.get(rateLimitKey, 'json');
  // if (rateLimitData && rateLimitData.count >= MAX_RATINGS_PER_WINDOW) {
  //   const elapsed = Date.now() - rateLimitData.windowStart;
  //   if (elapsed < RATE_LIMIT_WINDOW) {
  //     return new CORSResponse(
  //       JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
  //       { status: 429 }
  //     );
  //   }
  // }

  const key = `rating:${recipeId}`;
  
  // Use a simple atomic operation pattern
  // For better consistency, consider using Durable Objects
  let currentData = await env.RECIPE_RATINGS.get(key, 'json');
  
  if (!currentData) {
    currentData = {
      average: 0,
      count: 0,
      totalScore: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      updatedAt: Date.now()
    };
  }

  // Update the rating data
  currentData.count += 1;
  currentData.totalScore += score;
  currentData.average = currentData.totalScore / currentData.count;
  currentData.distribution[score] = (currentData.distribution[score] || 0) + 1;
  currentData.updatedAt = Date.now();

  // Store with a simple TTL (optional)
  await env.RECIPE_RATINGS.put(key, JSON.stringify(currentData), {
    expirationTtl: 60 * 60 * 24 * 365 // 1 year
  });

  // Update rate limit tracking
  // const rateLimitKey = `ratelimit:${clientIP}`;
  // await env.RECIPE_RATINGS.put(rateLimitKey, JSON.stringify({
  //   count: (rateLimitData?.count || 0) + 1,
  //   windowStart: rateLimitData?.windowStart || Date.now()
  // }), { expirationTtl: Math.ceil(RATE_LIMIT_WINDOW / 1000) + 60 });

  return new CORSResponse(JSON.stringify({
    success: true,
    recipeId,
    average: currentData.average,
    count: currentData.count,
    distribution: currentData.distribution
  }));
}

/**
 * POST batch get ratings
 * POST /?action=batch
 * Body: { "recipes": ["base64encoded1", "base64encoded2"] }
 */
async function handleBatchGet(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new CORSResponse(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400 }
    );
  }

  const recipeIds = body.recipes || [];
  if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
    return new CORSResponse(
      JSON.stringify({ error: 'Missing or invalid recipes array' }),
      { status: 400 }
    );
  }

  const results = {};
  
  // Fetch all ratings in parallel
  const promises = recipeIds.map(async (recipeId) => {
    const data = await env.RECIPE_RATINGS.get(`rating:${recipeId}`, 'json');
    results[recipeId] = data ? {
      average: data.average || 0,
      count: data.count || 0,
      distribution: data.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    } : { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  });

  await Promise.all(promises);

  return new CORSResponse(JSON.stringify({ results }));
}

// CORS helper
class CORSResponse extends Response {
  constructor(body, init = {}) {
    super(body, init);
    
    // Add CORS headers
    this.headers.set('Access-Control-Allow-Origin', '*');
    this.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    this.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    this.headers.set('Content-Type', 'application/json');
  }
}