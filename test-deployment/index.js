exports.helloWorld = (req, res) => {
  // Add CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }
  
  // Handle different routes
  if (req.path === '/api/test') {
    res.json({
      message: "Hello World! The API is running.",
      timestamp: new Date().toISOString()
    });
  } else {
    res.json({
      message: `Received request for path: ${req.path || '/'}`,
      timestamp: new Date().toISOString()
    });
  }
};