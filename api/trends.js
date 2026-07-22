export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { keyword, country = 'US', timerange = 'today 12-m' } = req.query;

    if (!keyword) {
        return res.status(400).json({ 
            error: 'Keyword parameter is required.',
            usage: '/api/trends?keyword=ai&country=US'
        });
    }

    // Configured to check RAPIDAPI_KEY, RAPIDAPI, and X_RAPIDAPI_KEY
    const rawKey = process.env.RAPIDAPI_KEY || process.env.RAPIDAPI || process.env.X_RAPIDAPI_KEY || '';
    const apiKey = rawKey.replace(/^["']|["']$/g, '').trim();

    if (!apiKey) {
        return res.status(500).json({ 
            error: 'Server configuration error: RAPIDAPI_KEY environment variable not defined in Vercel.',
            solution: 'Add RAPIDAPI_KEY in Vercel Project Settings -> Environment Variables, then trigger a fresh Redeploy.'
        });
    }

    const host = 'youtube-keywords-in-google-trends.p.rapidapi.com';

    // Construct request URL
    let url = `https://${host}/${encodeURIComponent(keyword)}`;
    const queryParams = [];
    if (country) queryParams.push(`country=${encodeURIComponent(country)}`);
    if (timerange) queryParams.push(`timerange=${encodeURIComponent(timerange)}`);
    if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
    }

    try {
        const apiResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': host,
                'Accept': 'application/json',
                'User-Agent': 'TrendTube-Proxy/2.5'
            }
        });

        // Read response text first to safely handle non-JSON or HTML error responses
        const responseText = await apiResponse.text();

        if (!apiResponse.ok) {
            let parsedError = responseText;
            try { parsedError = JSON.parse(responseText); } catch (e) {}

            return res.status(apiResponse.status).json({
                error: apiResponse.status === 403 
                    ? 'RapidAPI 403 Forbidden: Ensure you clicked "Subscribe" on the YouTube Keywords in Google Trends API on RapidAPI.'
                    : apiResponse.status === 401 
                    ? 'RapidAPI 401 Unauthorized: The RAPIDAPI_KEY set in Vercel is invalid.'
                    : `RapidAPI Error (${apiResponse.status}): ${apiResponse.statusText}`,
                statusCode: apiResponse.status,
                details: parsedError
            });
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseErr) {
            return res.status(502).json({
                error: 'RapidAPI returned an unparseable response format.',
                details: responseText.substring(0, 300)
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch trends data securely.',
            message: error.message || String(error),
            cause: error.cause ? (error.cause.message || String(error.cause)) : undefined,
            hint: 'Verify Vercel environment variables (RAPIDAPI_KEY) and trigger a fresh deployment.'
        });
    }
}
