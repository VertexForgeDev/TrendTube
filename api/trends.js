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

    const { keyword } = req.query;

    if (!keyword) {
        return res.status(400).json({ 
            error: 'Keyword parameter is required.',
            usage: '/api/trends?keyword=ai'
        });
    }

    const rawKey = process.env.RAPIDAPI || process.env.RAPIDAPI_KEY || '';
    const apiKey = rawKey.replace(/^["']|["']$/g, '').trim();

    if (!apiKey) {
        return res.status(500).json({ 
            error: 'Server configuration error: RAPIDAPI environment variable not defined.',
            solution: 'Add RAPIDAPI or RAPIDAPI_KEY in Vercel Project Settings -> Environment Variables, then redeploy.'
        });
    }

    const host = 'youtube-keywords-in-google-trends.p.rapidapi.com';

    // FIX FOR 400 ERROR:
    // This specific RapidAPI endpoint strictly takes the keyword as a path parameter.
    // Adding extra query parameters like ?country=US causes their server to throw a 400 Bad Request.
    // We construct the URL strictly with the keyword path.
    const cleanKeyword = keyword.trim();
    const url = `https://${host}/${encodeURIComponent(cleanKeyword)}`;

    try {
        const apiResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': host,
                'Accept': 'application/json'
            }
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            let parsedError = errorText;
            try { parsedError = JSON.parse(errorText); } catch (e) {}

            return res.status(apiResponse.status).json({
                error: apiResponse.status === 400 
                    ? 'RapidAPI 400 Bad Request: The external API rejected the formatting of this specific keyword.'
                    : apiResponse.status === 403 
                    ? 'RapidAPI 403 Forbidden: Ensure you clicked "Subscribe" on RapidAPI.'
                    : `RapidAPI Error (${apiResponse.status}): ${apiResponse.statusText}`,
                statusCode: apiResponse.status,
                details: parsedError
            });
        }

        const data = await apiResponse.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: 'Failed to fetch trends data securely.' });
    }
}
