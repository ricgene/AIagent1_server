/**
 * HTTP Cloud Function (1st gen).
 */
exports.helloWorld = (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }
  
  res.status(200).json({
    message: 'Hello World! The function is running.',
    timestamp: new Date().toISOString()
  });
};