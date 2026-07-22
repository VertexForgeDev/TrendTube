export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { keyword, country = 'US' } = req.query;

    if (!keyword) {
        return res.status(400).json({ error: 'Keyword parameter is required.' });
    }

    // Checking your existing environment variable name: RAPIDAPI
    const apiKey = process.env.RAPIDAPI;

    if (!apiKey) {
        // Fallback or development mode if environment variable is missing
        return res.status(500).json({ error: 'Server configuration error: RAPIDAPI environment variable not defined.' });
    }

    try {
        const rapidApiUrl = `https://youtube-keywords-in-google-trends.p.rapidapi.com/search?keyword=${encodeURIComponent(keyword)}&geo=${country}`;
        
        const apiResponse = await fetch(rapidApiUrl, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'youtube-keywords-in-google-trends.p.rapidapi.com'
            }
        });

        if (!apiResponse.ok) {
            throw new Error(`RapidAPI error: ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ error: 'Failed to fetch trends data securely.' });
    }
}
